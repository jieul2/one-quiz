"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Settings,
  Save,
  ShieldAlert,
  Power,
  Sliders,
  Moon,
  Sun,
  CheckCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

interface SettingsType {
  siteTitle: string;
  landingSubtitle: string;
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  disabledFeatures: {
    exam: boolean;
    diary: boolean;
    ideas: boolean;
    admin: boolean;
  };
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsType>({
    siteTitle: "oneQuiz",
    landingSubtitle: "",
    isMaintenanceMode: false,
    maintenanceMessage: "",
    disabledFeatures: { exam: false, diary: false, ideas: false, admin: false },
  });
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [mounted] = useState(true);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    async function loadInitialSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings({
            siteTitle: data.siteTitle || "oneQuiz",
            landingSubtitle: data.landingSubtitle || "",
            isMaintenanceMode: !!data.isMaintenanceMode,
            maintenanceMessage: data.maintenanceMessage || "",
            disabledFeatures: {
              exam: !!data.disabledFeatures?.exam,
              diary: !!data.disabledFeatures?.diary,
              ideas: !!data.disabledFeatures?.ideas,
              admin: !!data.disabledFeatures?.admin,
            },
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadInitialSettings();
  }, []);

  const saveSection = async (payload: Partial<SettingsType>, successMessage: string) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings({
          siteTitle: updated.data.siteTitle || "oneQuiz",
          landingSubtitle: updated.data.landingSubtitle || "",
          isMaintenanceMode: !!updated.data.isMaintenanceMode,
          maintenanceMessage: updated.data.maintenanceMessage || "",
          disabledFeatures: {
            exam: !!updated.data.disabledFeatures?.exam,
            diary: !!updated.data.disabledFeatures?.diary,
            ideas: !!updated.data.disabledFeatures?.ideas,
            admin: !!updated.data.disabledFeatures?.admin,
          },
        });
        setSuccessMsg(successMessage);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        alert("저장 실패");
      }
    } catch (e) {
      alert("서버 오류 발생");
    }
  };

  if (!mounted || loading) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] p-4 md:p-8 text-gray-800 dark:text-gray-200 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 💡 상단 네비게이션 헤더 (캘린더/일기장/기타 관리자 페이지와 통일된 반응형 구조) */}
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] p-4 md:p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link
              href="/admin"
              className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
              title="관리자 메인으로"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="overflow-hidden">
              <h1 className="text-base sm:text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white truncate">
                ⚙️ 사이트 전역 설정
              </h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                서비스 점검 모드, 상태메시지 및 개별 기능 제어
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] rounded-xl text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
              title="테마 변경"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-500 p-4 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fade-in">
            <CheckCircle size={16} className="shrink-0" />{" "}
            <span className="break-words">{successMsg}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* 1. 서비스 점검 모드 및 점검 메시지 섹션 */}
          <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-500 shrink-0" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                  서비스 긴급 점검 모드 제어
                </h2>
              </div>
              <span
                className={`text-[10px] px-2.5 py-1 rounded-full font-bold w-max ${settings.isMaintenanceMode ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}
              >
                {settings.isMaintenanceMode ? "🔴 점검 중" : "🟢 정상 서비스 중"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 pb-4 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  점검 모드 활성화
                </p>
                <p className="text-[11px] text-gray-400">
                  활성화 시 일반 사용자의 접근이 차단되며, 관리자 페이지만 접속할 수 있습니다.
                </p>
              </div>
              <input
                type="checkbox"
                checked={!!settings.isMaintenanceMode}
                onChange={(e) => setSettings({ ...settings, isMaintenanceMode: e.target.checked })}
                className="w-5 h-5 accent-red-500 cursor-pointer shrink-0"
              />
            </div>

            <div className="space-y-2 text-xs pt-1">
              <label className="block text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1.5">
                <Clock size={14} className="text-red-500 shrink-0" /> 점검 시간 안내 메시지 입력
              </label>
              <input
                type="text"
                value={settings.maintenanceMessage || ""}
                onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                placeholder="예: 10월 12일 02:00 ~ 04:00 (시스템 서버 안정화 작업)"
                className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white font-medium"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                saveSection(
                  {
                    isMaintenanceMode: settings.isMaintenanceMode,
                    maintenanceMessage: settings.maintenanceMessage,
                  },
                  "긴급 점검 모드 설정이 저장되었습니다.",
                )
              }
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <Save size={14} /> 점검 모드 설정만 저장
            </button>
          </div>

          {/* 2. 랜딩페이지 상태메시지 섹션 */}
          <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
              <Sliders size={18} className="text-green-500 shrink-0" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                랜딩페이지 상태메시지 설정
              </h2>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-gray-500 dark:text-gray-400 font-bold">
                상태메시지 (랜딩 상단 박스에 표시될 텍스트)
              </label>
              <input
                type="text"
                value={settings.landingSubtitle || ""}
                onChange={(e) => setSettings({ ...settings, landingSubtitle: e.target.value })}
                className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white font-medium"
                required
              />
            </div>

            <button
              type="button"
              onClick={() =>
                saveSection(
                  { landingSubtitle: settings.landingSubtitle },
                  "랜딩페이지 상태메시지가 저장되었습니다.",
                )
              }
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <Save size={14} /> 상태메시지 설정만 저장
            </button>
          </div>

          {/* 3. 개별 기능 ON/OFF 제어 섹션 */}
          <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
              <Power size={18} className="text-yellow-500 shrink-0" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                개별 기능 ON/OFF 제어
              </h2>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800 pb-3 gap-4">
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-200">시험 응시하기 기능</p>
                  <p className="text-[11px] text-gray-400">
                    OFF 시 랜딩페이지에서 시험 응시 모듈 접근이 차단됩니다.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!settings.disabledFeatures?.exam}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      disabledFeatures: { ...settings.disabledFeatures, exam: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-yellow-500 cursor-pointer shrink-0"
                />
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800 pb-3 gap-4">
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-200">나만의 일기장 기능</p>
                  <p className="text-[11px] text-gray-400">
                    OFF 시 랜딩페이지에서 일기장 모듈 접근이 차단됩니다.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!settings.disabledFeatures?.diary}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      disabledFeatures: { ...settings.disabledFeatures, diary: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-yellow-500 cursor-pointer shrink-0"
                />
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800 pb-3 gap-4">
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-200">
                    개발 예정 기능 (아이디어 백로그)
                  </p>
                  <p className="text-[11px] text-gray-400">
                    OFF 시 랜딩페이지에서 아이디어 백로그 모듈 접근이 차단됩니다.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!settings.disabledFeatures?.ideas}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      disabledFeatures: { ...settings.disabledFeatures, ideas: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-yellow-500 cursor-pointer shrink-0"
                />
              </div>

              <div className="flex items-center justify-between py-1 gap-4">
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-200">관리자 페이지 접근</p>
                  <p className="text-[11px] text-gray-400">
                    OFF 시 랜딩페이지에서 관리자 페이지 접근이 차단됩니다.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!settings.disabledFeatures?.admin}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      disabledFeatures: { ...settings.disabledFeatures, admin: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-yellow-500 cursor-pointer shrink-0"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                saveSection(
                  { disabledFeatures: settings.disabledFeatures },
                  "기능별 ON/OFF 제어 설정이 저장되었습니다.",
                )
              }
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer text-xs mt-4"
            >
              <Save size={14} /> 기능별 ON/OFF 설정만 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
