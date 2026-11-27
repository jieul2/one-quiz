import { NextRequest, NextResponse } from "next/server";

// 기상청 공공데이터 API 인증키
const DEFAULT_KMA_KEY = "a77dee88810f574be5ff8763843d5267d7077490ae9f4fdfbb98991f4d2176a3";

// 주요 도시별 기상청 격자 좌표 프리셋
const CITY_COORDINATES: Record<string, { nx: number; ny: number; name: string }> = {
  seoul: { nx: 60, ny: 127, name: "서울특별시" },
  incheon: { nx: 55, ny: 124, name: "인천광역시" },
  suwon: { nx: 60, ny: 120, name: "수원시" },
  busan: { nx: 98, ny: 76, name: "부산광역시" },
  daegu: { nx: 89, ny: 90, name: "대구광역시" },
  daejeon: { nx: 67, ny: 100, name: "대전광역시" },
  gwangju: { nx: 58, ny: 74, name: "광주광역시" },
  ulsan: { nx: 102, ny: 84, name: "울산광역시" },
  gangneung: { nx: 92, ny: 131, name: "강릉시" },
  jeju: { nx: 52, ny: 38, name: "제주특별자치도" },
  sejong: { nx: 66, ny: 103, name: "세종특별자치시" },
};

// 위경도 -> 기상청 좌표(nx, ny) 변환 함수 (기상청 표준 LCC 투영 알고리즘)
function convertLatLngToGrid(lat: number, lng: number) {
  const RE = 6371.00877; // 지구 반경(km)
  const GRID = 5.0; // 격자 간격(km)
  const SLAT1 = 30.0; // 투영 위도1(degree)
  const SLAT2 = 60.0; // 투영 위도2(degree)
  const OLON = 126.0; // 기준점 경도(degree)
  const OLAT = 38.0; // 기준점 위도(degree)
  const XO = 43; // 기준점 X좌표(GRID)
  const YO = 136; // 기준점 Y좌표(GRID)

  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx, ny };
}

// 인메모리 캐시 (10분 TTL)
interface CachedWeather {
  data: unknown;
  timestamp: number;
}
const weatherCache = new Map<string, CachedWeather>();
const CACHE_TTL = 10 * 60 * 1000; // 10분

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const cityParam = searchParams.get("city")?.toLowerCase();
  const nxParam = searchParams.get("nx");
  const nyParam = searchParams.get("ny");

  // 디폴트 좌표 및 지역명: 대전광역시 (nx: 67, ny: 100)
  let nx = 67;
  let ny = 100;
  let locationName = "대전광역시";

  if (cityParam && CITY_COORDINATES[cityParam]) {
    const c = CITY_COORDINATES[cityParam];
    nx = c.nx;
    ny = c.ny;
    locationName = c.name;
  } else if (latParam && lngParam) {
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    if (!isNaN(lat) && !isNaN(lng)) {
      const grid = convertLatLngToGrid(lat, lng);
      nx = grid.nx;
      ny = grid.ny;

      // 가장 인접한 주요 도시명 감지
      let closestCityName = "";
      let minDistance = Infinity;
      for (const key in CITY_COORDINATES) {
        const c = CITY_COORDINATES[key];
        const dist = Math.hypot(grid.nx - c.nx, grid.ny - c.ny);
        if (dist < minDistance) {
          minDistance = dist;
          closestCityName = c.name;
        }
      }

      if (minDistance <= 6 && closestCityName) {
        const shortName = closestCityName
          .replace("광역시", "")
          .replace("특별자치시", "")
          .replace("특별자치도", "");
        locationName = `현재 위치 (${shortName})`;
      } else {
        locationName = "현재 위치";
      }
    }
  } else if (nxParam && nyParam) {
    nx = parseInt(nxParam, 10) || 67;
    ny = parseInt(nyParam, 10) || 100;
  }

  const cacheKey = `${nx}_${ny}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT" },
    });
  }

  // 기상청 발표 기준일시(KST) 산출
  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);

  // 1. 초단기실황 (매시 40분 발표) 기준일시
  let ncstDate = kst.toISOString().slice(0, 10).replace(/-/g, "");
  let ncstHours = kst.getHours();
  const ncstMins = kst.getMinutes();

  if (ncstMins < 40) {
    if (ncstHours === 0) {
      const yesterday = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
      ncstDate = yesterday.toISOString().slice(0, 10).replace(/-/g, "");
      ncstHours = 23;
    } else {
      ncstHours -= 1;
    }
  }
  const ncstTime = String(ncstHours).padStart(2, "0") + "00";

  // 2. 초단기예보 (매시 45분 발표) 기준일시
  let fcstDate = kst.toISOString().slice(0, 10).replace(/-/g, "");
  let fcstHours = kst.getHours();
  const fcstMins = kst.getMinutes();

  if (fcstMins < 45) {
    if (fcstHours === 0) {
      const yesterday = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
      fcstDate = yesterday.toISOString().slice(0, 10).replace(/-/g, "");
      fcstHours = 23;
    } else {
      fcstHours -= 1;
    }
  }
  const fcstTime = String(fcstHours).padStart(2, "0") + "30";

  const apiKey = process.env.KMA_SERVICE_KEY || DEFAULT_KMA_KEY;

  try {
    // 초단기실황 & 초단기예보 동시 조회
    const [ncstRes, fcstRes] = await Promise.all([
      fetch(
        `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?` +
          new URLSearchParams({
            serviceKey: apiKey,
            pageNo: "1",
            numOfRows: "10",
            dataType: "JSON",
            base_date: ncstDate,
            base_time: ncstTime,
            nx: String(nx),
            ny: String(ny),
          }),
        { next: { revalidate: 600 } }
      ).then((r) => (r.ok ? r.json() : null)).catch(() => null),

      fetch(
        `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst?` +
          new URLSearchParams({
            serviceKey: apiKey,
            pageNo: "1",
            numOfRows: "60",
            dataType: "JSON",
            base_date: fcstDate,
            base_time: fcstTime,
            nx: String(nx),
            ny: String(ny),
          }),
        { next: { revalidate: 600 } }
      ).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);

    // 실황 데이터 파싱
    const ncstItems = ncstRes?.response?.body?.items?.item || [];
    const observationMap: Record<string, string> = {};
    for (const item of ncstItems) {
      if (item.category && item.obsrValue !== undefined) {
        observationMap[item.category] = String(item.obsrValue);
      }
    }

    const tempStr = observationMap["T1H"];
    const humidityStr = observationMap["REH"];
    const rainStr = observationMap["RN1"];
    const ptyStr = observationMap["PTY"];
    const windStr = observationMap["WSD"];

    // 예보 데이터 파싱 (향후 6시간 기온 및 하늘 상태)
    const fcstItems = fcstRes?.response?.body?.items?.item || [];
    const hourlyForecasts: Array<{
      time: string;
      temp: number;
      sky: string;
      pty: number;
    }> = [];

    // 시간대별 카테고리 매핑
    const timeSlotMap: Record<string, Record<string, string>> = {};
    for (const item of fcstItems) {
      const fTime = item.fcstTime; // "2300"
      if (!timeSlotMap[fTime]) {
        timeSlotMap[fTime] = {};
      }
      timeSlotMap[fTime][item.category] = String(item.fcstValue);
    }

    // 다음 6개 시간대 추출
    const sortedTimes = Object.keys(timeSlotMap).sort();
    for (const fTime of sortedTimes.slice(0, 6)) {
      const slot = timeSlotMap[fTime];
      const hourNum = parseInt(fTime.slice(0, 2), 10);
      const skyCode = slot["SKY"] || "1";
      const ptyCode = parseInt(slot["PTY"] || "0", 10);
      const tempVal = parseFloat(slot["T1H"] || "0");

      let skyLabel = "맑음";
      if (ptyCode === 1) skyLabel = "비";
      else if (ptyCode === 2) skyLabel = "비/눈";
      else if (ptyCode === 3) skyLabel = "눈";
      else if (ptyCode === 4) skyLabel = "소나기";
      else if (skyCode === "3") skyLabel = "구름많음";
      else if (skyCode === "4") skyLabel = "흐림";

      hourlyForecasts.push({
        time: `${hourNum}시`,
        temp: Math.round(tempVal),
        sky: skyLabel,
        pty: ptyCode,
      });
    }

    // 현재 하늘 상태 파악 (실황 PTY 우선, 없으면 예보 첫 번째 SKY)
    const currentPty = parseInt(ptyStr || "0", 10);
    const firstSky = hourlyForecasts[0]?.sky || "맑음";
    let statusText = firstSky;
    if (currentPty === 1) statusText = "비";
    else if (currentPty === 2) statusText = "비/눈";
    else if (currentPty === 3) statusText = "눈";
    else if (currentPty === 5) statusText = "빗방울";
    else if (currentPty === 6) statusText = "진눈깨비";
    else if (currentPty === 7) statusText = "눈날림";

    const temperature = tempStr !== undefined ? parseFloat(tempStr) : 15;
    const humidity = humidityStr !== undefined ? parseInt(humidityStr, 10) : 60;
    const windSpeed = windStr !== undefined ? parseFloat(windStr) : 1.5;
    const rain = rainStr !== undefined ? parseFloat(rainStr) : 0;

    const payload = {
      success: true,
      source: "kma_public_data",
      location: locationName,
      temperature,
      status: statusText,
      pty: currentPty,
      humidity,
      windSpeed,
      rain,
      updatedAt: `${ncstHours}:${String(ncstMins).padStart(2, "0")}`,
      hourly: hourlyForecasts.length > 0 ? hourlyForecasts : generateFallbackHourly(temperature),
    };

    weatherCache.set(cacheKey, { data: payload, timestamp: Date.now() });

    return NextResponse.json(payload, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("KMA Weather API Error:", error);

    // 에러 발생 시 부드러운 폴백 데이터 반환
    const fallbackPayload = {
      success: true,
      source: "fallback",
      location: locationName,
      temperature: 15,
      status: "맑음",
      pty: 0,
      humidity: 58,
      windSpeed: 1.8,
      rain: 0,
      updatedAt: "방금 전",
      hourly: generateFallbackHourly(15),
    };

    return NextResponse.json(fallbackPayload);
  }
}

function generateFallbackHourly(baseTemp: number) {
  const now = new Date();
  const currentHour = now.getHours();
  return [1, 2, 3, 4, 5, 6].map((offset) => {
    const h = (currentHour + offset) % 24;
    return {
      time: `${h}시`,
      temp: Math.round(baseTemp + Math.sin(offset) * 2),
      sky: "맑음",
      pty: 0,
    };
  });
}
