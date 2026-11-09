/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity,
  Flame,
  Timer,
  Zap,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  Heart,
  Sparkles,
  Camera,
  ChevronDown,
  ChevronUp,
  X,
  Footprints,
  CloudSun,
} from "lucide-react";
import { toast } from "@/lib/toast";

interface RunningLogItem {
  _id: string;
  userEmail: string;
  userName?: string;
  date: string;
  distanceKm: number;
  durationMinutes: number;
  pace: string;
  calories: number;
  heartRateAvg?: number;
  cadence?: number;
  location?: string;
  shoes?: string;
  weather?: string;
  memo?: string;
  proofImageUrl?: string;
  aiFeedback?: string;
  createdAt: string;
}

interface RunningStats {
  totalRuns: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalCalories: number;
  avgPace: string;
}

export function RunningView() {
  const [logs, setLogs] = useState<RunningLogItem[]>([]);
  const [stats, setStats] = useState<RunningStats>({
    totalRuns: 0,
    totalDistanceKm: 0,
    totalDurationMinutes: 0,
    totalCalories: 0,
    avgPace: "-",
  });
  const [isLoading, setIsLoading] = useState(true);

  // 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAiSyncModalOpen, setIsAiSyncModalOpen] = useState(false);
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);

  // 입력 폼 상태
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [distanceKm, setDistanceKm] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [calories, setCalories] = useState("");
  const [heartRateAvg, setHeartRateAvg] = useState("");
  const [cadence, setCadence] = useState("");
  const [location, setLocation] = useState("");
  const [shoes, setShoes] = useState("");
  const [weather, setWeather] = useState("맑음");
  const [memo, setMemo] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState("");

  // 실시간 계산 페이스
  const computedPacePreview = useMemo(() => {
    const dist = parseFloat(distanceKm);
    const dur = parseFloat(durationMinutes);
    if (!dist || !dur || dist <= 0 || dur <= 0) return "-";
    const rawPace = dur / dist;
    const pMin = Math.floor(rawPace);
    const pSec = Math.round((rawPace - pMin) * 60);
    return `${pMin}'${String(pSec).padStart(2, "0")}"`;
  }, [distanceKm, durationMinutes]);

  // 기록 불러오기
  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/running");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      toast.error("러닝 기록을 불러오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadRunningLogs() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/running");
        if (res.ok && !ignore) {
          const data = await res.json();
          setLogs(data.logs || []);
          if (data.stats) setStats(data.stats);
        }
      } catch {
        // error handling
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    loadRunningLogs();
    return () => {
      ignore = true;
    };
  }, []);

  // 기록 추가 핸들러
  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distanceKm || !durationMinutes) {
      toast.error("거리(km)와 달린 시간(분)을 입력해주세요.");
      return;
    }

    try {
      const res = await fetch("/api/running", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          distanceKm: parseFloat(distanceKm),
          durationMinutes: parseFloat(durationMinutes),
          pace: computedPacePreview !== "-" ? computedPacePreview : undefined,
          calories: calories ? parseInt(calories, 10) : undefined,
          heartRateAvg: heartRateAvg ? parseInt(heartRateAvg, 10) : undefined,
          cadence: cadence ? parseInt(cadence, 10) : undefined,
          location: location.trim(),
          shoes: shoes.trim(),
          weather,
          memo: memo.trim(),
          proofImageUrl: proofImageUrl.trim(),
        }),
      });

      if (res.ok) {
        toast.success("🏃‍♂️ 러닝 인증 및 기록이 등록되었습니다!");
        setIsAddModalOpen(false);
        // 폼 초기화
        setDistanceKm("");
        setDurationMinutes("");
        setCalories("");
        setHeartRateAvg("");
        setCadence("");
        setLocation("");
        setShoes("");
        setMemo("");
        setProofImageUrl("");
        fetchLogs();
      } else {
        const err = await res.json();
        toast.error(err.error || "기록 등록에 실패했습니다.");
      }
    } catch {
      toast.error("서버 통신 오류가 발생했습니다.");
    }
  };

  // 기록 삭제 핸들러
  const handleDeleteLog = async (id: string) => {
    if (!confirm("정말 이 러닝 기록을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/running?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("러닝 기록이 삭제되었습니다.");
        fetchLogs();
      } else {
        toast.error("삭제 실패");
      }
    } catch {
      toast.error("서버 통신 오류");
    }
  };

  const latestFeedback = logs.length > 0 && logs[0].aiFeedback ? logs[0].aiFeedback : null;

  return (
    <div className="w-full space-y-6 pb-12 animate-fade-in">
      {/* 1. 상단 타이틀 & 액션 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="ui-page-title flex items-center gap-2">
                러닝(달리기) 기록
                <span className="ui-badge px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold">
                  RUN TRACKER
                </span>
              </h1>
              <p className="ui-page-subtitle">
                나만의 러닝 습관을 기록하고 AI 코치의 맞춤 피드백과 함께 성장하세요.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap sm:flex-wrap py-1 max-w-full shrink-0">
          <button
            onClick={() => setIsAiSyncModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant hover:border-primary text-on-surface text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>AI 자동 연동</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>러닝 인증 및 기록</span>
          </button>
        </div>
      </div>

      {/* 2. 핵심 KPI 메트릭 카드 4종 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 w-full">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="ui-caption font-bold">누적 달린 거리</span>
            <Footprints className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-on-surface font-mono">
            {stats.totalDistanceKm} <span className="text-xs font-normal text-on-surface-variant font-sans">km</span>
          </div>
          <div className="ui-caption text-on-surface-variant mt-1">총 {stats.totalRuns}회 달성</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="ui-caption font-bold">평균 페이스</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-on-surface font-mono">
            {stats.avgPace} <span className="text-xs font-normal text-on-surface-variant font-sans">/km</span>
          </div>
          <div className="ui-caption text-on-surface-variant mt-1">지속 유산소 페이스</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="ui-caption font-bold">총 러닝 시간</span>
            <Timer className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-on-surface font-mono">
            {stats.totalDurationMinutes} <span className="text-xs font-normal text-on-surface-variant font-sans">분</span>
          </div>
          <div className="ui-caption text-on-surface-variant mt-1">
            약 {(stats.totalDurationMinutes / 60).toFixed(1)}시간 심폐 훈련
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="ui-caption font-bold">소모 칼로리</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-on-surface font-mono">
            {stats.totalCalories.toLocaleString()} <span className="text-xs font-normal text-on-surface-variant font-sans">kcal</span>
          </div>
          <div className="ui-caption text-on-surface-variant mt-1">활력 증진 완료</div>
        </div>
      </div>

      {/* 3. 최근 AI 러닝 코치 피드백 카드 */}
      {latestFeedback && (
        <div className="bg-gradient-to-r from-primary/10 via-surface-container-lowest to-surface-container-lowest border border-primary/20 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5 text-on-primary" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="ui-card-title text-primary font-bold">AI 러닝 코치 실시간 분석</span>
                <span className="ui-badge px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold text-[10px]">
                  최신 런 기준
                </span>
              </div>
              <p className="ui-body text-xs text-on-surface leading-relaxed whitespace-pre-line">
                {latestFeedback}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. 러닝 기록 목록 피드 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="ui-section-title">달리기 인증 & 기록 피드</h2>
            <span className="ui-badge px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs">
              {logs.length}개
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-on-surface-variant ui-caption">
            기록을 불러오는 중입니다...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30 text-primary" />
            <p className="ui-empty-state">아직 등록된 러닝 기록이 없습니다.</p>
            <p className="ui-caption text-on-surface-variant/70 mt-1">
              오늘 첫 러닝을 달리고 인증 사진과 함께 기록을 남겨보세요!
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity"
            >
              첫 러닝 기록하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 w-full">
            {logs.map((log) => {
              const isExpanded = expandedFeedbackId === log._id;
              const dateObj = new Date(log.date);
              const formattedDate = `${dateObj.getFullYear()}.${String(
                dateObj.getMonth() + 1
              ).padStart(2, "0")}.${String(dateObj.getDate()).padStart(2, "0")}`;

              return (
                <div
                  key={log._id}
                  className="bg-surface-container-low border border-outline-variant rounded-2xl p-4 flex flex-col justify-between hover:border-primary/50 transition-all shadow-xs"
                >
                  <div>
                    {/* 상단 메타 헤더 */}
                    <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
                        <span className="text-xs font-bold text-on-surface">{formattedDate}</span>
                        {log.weather && (
                          <span className="flex items-center gap-1 text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                            <CloudSun className="w-3 h-3 text-amber-500" />
                            {log.weather}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteLog(log._id)}
                        className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors cursor-pointer"
                        title="기록 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 핵심 지표 (거리 / 시간 / 페이스 / 칼로리) */}
                    <div className="grid grid-cols-4 gap-2 my-3 text-center py-2 bg-surface-container-lowest rounded-xl border border-outline-variant/40">
                      <div>
                        <div className="text-[10px] text-on-surface-variant font-medium">거리</div>
                        <div className="text-sm font-black text-primary font-mono">
                          {log.distanceKm} <span className="text-[9px] font-normal">km</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-on-surface-variant font-medium">시간</div>
                        <div className="text-sm font-black text-on-surface font-mono">
                          {log.durationMinutes} <span className="text-[9px] font-normal">분</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-on-surface-variant font-medium">페이스</div>
                        <div className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                          {log.pace}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-on-surface-variant font-medium">칼로리</div>
                        <div className="text-sm font-black text-rose-500 font-mono">
                          {log.calories} <span className="text-[9px] font-normal">kcal</span>
                        </div>
                      </div>
                    </div>

                    {/* 위치 & 심박 & 착용 장비 정보 */}
                    <div className="flex items-center gap-3 flex-wrap text-xs text-on-surface-variant mb-2">
                      {log.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          {log.location}
                        </span>
                      )}
                      {log.heartRateAvg && log.heartRateAvg > 0 ? (
                        <span className="flex items-center gap-1 text-rose-500">
                          <Heart className="w-3 h-3 fill-rose-500/20" />
                          {log.heartRateAvg} bpm
                        </span>
                      ) : null}
                      {log.shoes && (
                        <span className="text-[11px] bg-surface-container px-2 py-0.5 rounded-md">
                          👟 {log.shoes}
                        </span>
                      )}
                    </div>

                    {/* 인증 사진이 있는 경우 표시 */}
                    {log.proofImageUrl && (
                      <div className="my-2.5 rounded-xl overflow-hidden border border-outline-variant/60 max-h-48 bg-black/5">
                        <img
                          src={log.proofImageUrl}
                          alt="러닝 인증 사진"
                          className="w-full h-40 object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    )}

                    {/* 메모 소감 */}
                    {log.memo && (
                      <p className="ui-body text-xs text-on-surface/90 bg-surface-container-lowest p-2.5 rounded-xl border border-outline-variant/40 my-2">
                        {log.memo}
                      </p>
                    )}
                  </div>

                  {/* AI 코치 피드백 토글 영역 */}
                  {log.aiFeedback && (
                    <div className="mt-3 pt-2.5 border-t border-outline-variant/60">
                      <button
                        onClick={() =>
                          setExpandedFeedbackId(isExpanded ? null : log._id)
                        }
                        className="w-full flex items-center justify-between text-xs text-primary font-bold hover:underline cursor-pointer py-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          AI 코치 피드백 {isExpanded ? "접기" : "보기"}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-on-surface whitespace-pre-line leading-relaxed animate-in fade-in">
                          {log.aiFeedback}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. 러닝 인증 및 기록 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-sidebar-scroll animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="ui-section-title">달리기 인증 & 기록 등록</h3>
                  <p className="ui-caption">달린 기록을 저장하면 AI 러닝 코치가 즉시 분석해드립니다.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLog} className="flex flex-col gap-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    러닝 일자 <span className="text-primary">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    required
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-hidden focus:border-primary font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    날씨
                  </label>
                  <select
                    value={weather}
                    onChange={(e) => setWeather(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-hidden focus:border-primary font-medium"
                  >
                    <option value="맑음">☀️ 맑음</option>
                    <option value="구름조금">⛅ 구름조금</option>
                    <option value="흐림">☁️ 흐림</option>
                    <option value="비">🌧️ 비</option>
                    <option value="실내트레드밀">🏃 실내 트레드밀</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    달린 거리 (km) <span className="text-primary">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="예: 5.2"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    required
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-hidden focus:border-primary font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    달린 시간 (분) <span className="text-primary">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="예: 28.5"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    required
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-hidden focus:border-primary font-mono font-bold"
                  />
                </div>
              </div>

              {/* 자동 계산된 페이스 실시간 피드백 */}
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-primary" />
                  실시간 환산 페이스:
                </span>
                <span className="text-sm font-black text-primary font-mono">
                  {computedPacePreview} /km
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-on-surface mb-1">
                    소모 칼로리 (kcal)
                  </label>
                  <input
                    type="number"
                    placeholder="자동 계산"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-2.5 py-2 text-xs text-on-surface font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface mb-1">
                    평균 심박수 (bpm)
                  </label>
                  <input
                    type="number"
                    placeholder="예: 154"
                    value={heartRateAvg}
                    onChange={(e) => setHeartRateAvg(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-2.5 py-2 text-xs text-on-surface font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface mb-1">
                    케이던스 (spm)
                  </label>
                  <input
                    type="number"
                    placeholder="예: 172"
                    value={cadence}
                    onChange={(e) => setCadence(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-2.5 py-2 text-xs text-on-surface font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    러닝 코스 / 장소
                  </label>
                  <input
                    type="text"
                    placeholder="예: 한강 반포지구, 올림픽공원"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    착용 러닝화
                  </label>
                  <input
                    type="text"
                    placeholder="예: 나이키 베이퍼플라이"
                    value={shoes}
                    onChange={(e) => setShoes(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  달리기 인증 사진 URL (선택)
                </label>
                <div className="relative">
                  <Camera className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                  <input
                    type="url"
                    placeholder="스마트워치 / GPS 코스 인증 이미지 링크"
                    value={proofImageUrl}
                    onChange={(e) => setProofImageUrl(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  러닝 소감 및 컨디션 메모
                </label>
                <textarea
                  rows={2}
                  placeholder="오늘의 호흡, 다리 피로도, 기분 등을 자유롭게 적어보세요."
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs font-semibold cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  기록 저장 및 AI 분석
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. AI 자동 기록 연동 로드맵 모달 */}
      {isAiSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="ui-section-title">AI 자동 기록 연동 안내</h3>
                  <p className="ui-caption">러닝 앱 데이터를 자동으로 가져옵니다.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiSyncModalOpen(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 my-4 text-xs text-on-surface">
              <p className="leading-relaxed">
                현재 Nike Run Club, Strava, Apple Fitness, Garmin 러닝 기록을 자동으로 가져오는 API 및 OCR 인증 스캔 엔진을 개발 중입니다.
              </p>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🟠</span>
                    <div>
                      <div className="font-bold">Strava API 실시간 동기화</div>
                      <div className="text-[10px] text-on-surface-variant">OAuth 연동 후 달리기 완료 시 자동 등록</div>
                    </div>
                  </div>
                  <span className="ui-badge px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-[10px]">
                    준비중
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">⚡</span>
                    <div>
                      <div className="font-bold">Nike Run Club 스크린샷 AI 인식</div>
                      <div className="text-[10px] text-on-surface-variant">인증 사진을 올리면 거리/페이스 자동 추출</div>
                    </div>
                  </div>
                  <span className="ui-badge px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                    베타 예정
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🍎</span>
                    <div>
                      <div className="font-bold">Apple 건강 & Apple Watch 연동</div>
                      <div className="text-[10px] text-on-surface-variant">심박수, 케이던스, 고도 변화 자동 분석</div>
                    </div>
                  </div>
                  <span className="ui-badge px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold text-[10px]">
                    개발중
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary leading-relaxed">
                💡 현재는 상단의 <strong>[러닝 인증 및 기록]</strong> 버튼을 통해 직접 거리와 시간, 인증 사진을 올려주시면 AI 러닝 코치가 즉시 전문 피드백을 제공합니다!
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setIsAiSyncModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
