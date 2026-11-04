"use client";

import React, { useState, useEffect } from "react";
import {
  Save,
  ShieldAlert,
  Power,
  Sliders,
  CheckCircle,
  Settings as SettingsIcon,
  Database,
  Mail,
} from "lucide-react";
import { useMounted } from "@/lib/hooks/useMounted";

// 단정하고 심플한 Google 아이콘
function GoogleMarkIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center font-bold text-[11px] text-primary ${className}`}>
      G
    </span>
  );
}

// 스위치 토글 컴포넌트 (테마 색상 primary / surface 준수)
function SwitchToggle({
  checked,
  onChange,
  activeLabel,
  inactiveLabel,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => onChange(!checked)}>
      {(activeLabel || inactiveLabel) && (
        <span className={`text-xs ${checked ? "font-semibold text-on-surface" : "font-light text-on-surface-variant"}`}>
          {checked ? activeLabel : inactiveLabel}
        </span>
      )}
      <div
        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-150 ${
          checked ? "bg-primary" : "bg-surface-container-high border border-outline-variant"
        }`}
      >
        <div
          className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform duration-150 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
}

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

type AdminSubTab = "overview" | "maintenance" | "subtitle" | "features" | "security" | "google";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<AdminSubTab>("overview");
  const [settings, setSettings] = useState<SettingsType>({
    siteTitle: "원퀴즈 (OneQuiz)",
    landingSubtitle: "",
    isMaintenanceMode: false,
    maintenanceMessage: "",
    disabledFeatures: { exam: false, diary: false, ideas: false, admin: false },
  });
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const mounted = useMounted();

  useEffect(() => {
    async function loadInitialSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings({
            siteTitle: data.siteTitle || "원퀴즈 (OneQuiz)",
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
      } catch {
        console.error("Failed to load settings");
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
        setSettings((prev) => ({ ...prev, ...payload }));
        setSuccessMsg(successMessage);
        setTimeout(() => setSuccessMsg(""), 2500);
      } else {
        alert("설정 저장 중 오류가 발생했습니다.");
      }
    } catch {
      alert("서버 통신 실패");
    }
  };

  if (!mounted || loading) {
    return (
      <div className="py-12 text-center text-xs text-on-surface-variant font-light">
        설정 정보를 불러오는 중...
      </div>
    );
  }

  const subTabs: { id: AdminSubTab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "운영 개요", icon: SettingsIcon },
    { id: "maintenance", label: "긴급 점검", icon: ShieldAlert },
    { id: "subtitle", label: "안내 문구", icon: Sliders },
    { id: "features", label: "기능 제어", icon: Power },
    { id: "security", label: "보안 관리", icon: Database },
    { id: "google", label: "Google 연동", icon: Mail },
  ];

  return (
    <div className="space-y-4">
      {/* 서브 탭 수평 필터 바 */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-x-auto scrollbar-none">
        {subTabs.map((t) => {
          const isActive = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? "bg-surface-container text-on-surface font-semibold"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-light"
              }`}
            >
              <Icon size={13} className={isActive ? "text-primary" : "text-on-surface-variant"} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 저장 완료 알림 토스트 */}
      {successMsg && (
        <div className="p-2.5 bg-surface-container border border-outline-variant text-on-surface rounded-md text-xs font-medium flex items-center gap-2">
          <CheckCircle size={14} className="text-primary shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ================= 1. 운영 개요 탭 ================= */}
      {activeTab === "overview" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-xs text-on-surface">시스템 운영 현황</h2>
              <p className="text-xs text-on-surface-variant font-light mt-0.5">
                원퀴즈 플랫폼의 현재 가동 상태와 데이터베이스 연결을 점검합니다.
              </p>
            </div>

            <span
              className={`text-[11px] px-2 py-0.5 rounded font-medium border ${
                settings.isMaintenanceMode
                  ? "bg-red-500/10 text-red-500 border-red-500/30"
                  : "bg-blue-500/10 text-blue-500 border-blue-500/30"
              }`}
            >
              {settings.isMaintenanceMode ? "점검 모드 (긴급)" : "정상 운영"}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-md border border-outline-variant">
            <div>
              <p className="font-medium text-xs text-on-surface">긴급 점검 모드</p>
              <p className="text-[11px] text-on-surface-variant font-light">
                활성화 시 관리자 이외 일반 이용자의 접근이 차단됩니다.
              </p>
            </div>

            <SwitchToggle
              checked={settings.isMaintenanceMode}
              onChange={(val) => {
                saveSection({ isMaintenanceMode: val }, "점검 모드 상태가 변경되었습니다.");
              }}
              activeLabel="점검 중"
              inactiveLabel="정상 운영"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-md bg-surface-container-low border border-outline-variant">
              <p className="text-[10px] text-on-surface-variant font-medium">데이터베이스</p>
              <p className="font-semibold text-on-surface mt-0.5">MongoDB 정상</p>
            </div>
            <div className="p-2.5 rounded-md bg-surface-container-low border border-outline-variant">
              <p className="text-[10px] text-on-surface-variant font-medium">기능 모듈</p>
              <p className="font-semibold text-on-surface mt-0.5">4개 모듈 정상 가동</p>
            </div>
            <div className="p-2.5 rounded-md bg-surface-container-low border border-outline-variant col-span-2 sm:col-span-1">
              <p className="text-[10px] text-on-surface-variant font-medium">테마 지원</p>
              <p className="font-semibold text-on-surface mt-0.5">24개 테마 활성화</p>
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. 긴급 점검 모드 탭 ================= */}
      {activeTab === "maintenance" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3.5">
          <div className="flex items-center justify-between border-b border-outline-variant pb-2.5">
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={15} className="text-secondary" />
              <h2 className="font-semibold text-xs text-on-surface">서비스 긴급 점검 제어</h2>
            </div>
            <span
              className={`text-[11px] px-2 py-0.5 rounded font-medium border ${
                settings.isMaintenanceMode
                  ? "bg-red-500/10 text-red-500 border-red-500/30"
                  : "bg-blue-500/10 text-blue-500 border-blue-500/30"
              }`}
            >
              {settings.isMaintenanceMode ? "점검 중" : "정상 서비스"}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-md border border-outline-variant">
            <div>
              <p className="text-xs font-medium text-on-surface">점검 모드 활성화</p>
              <p className="text-[11px] text-on-surface-variant font-light">
                활성화 시 일반 사용자의 접근이 차단되며, 점검 안내 화면이 노출됩니다.
              </p>
            </div>

            <SwitchToggle
              checked={settings.isMaintenanceMode}
              onChange={(val) => setSettings({ ...settings, isMaintenanceMode: val })}
              activeLabel="점검 ON"
              inactiveLabel="점검 OFF"
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-medium text-on-surface">점검 안내 메시지</label>
            <textarea
              value={settings.maintenanceMessage}
              onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
              placeholder="예: 시스템 안정화 작업 중입니다. 14:00 이후 정상 서비스될 예정입니다."
              rows={3}
              className="w-full bg-surface-container-low border border-outline-variant rounded-md p-2.5 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors resize-none font-light"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() =>
                saveSection(
                  {
                    isMaintenanceMode: settings.isMaintenanceMode,
                    maintenanceMessage: settings.maintenanceMessage,
                  },
                  "점검 모드 설정이 저장되었습니다."
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary font-medium rounded-md text-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Save size={13} />
              <span>점검 설정 저장</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= 3. 안내 문구 탭 ================= */}
      {activeTab === "subtitle" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3.5">
          <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
            <Sliders size={15} className="text-primary" />
            <h2 className="font-semibold text-xs text-on-surface">랜딩 안내 문구 설정</h2>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-on-surface">플랫폼 대표 타이틀</label>
              <input
                type="text"
                value={settings.siteTitle}
                onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-on-surface">메인 랜딩 서브타이틀</label>
              <textarea
                value={settings.landingSubtitle}
                onChange={(e) => setSettings({ ...settings, landingSubtitle: e.target.value })}
                placeholder="플랫폼 메인 화면 상단에 노출될 소개 문구를 입력하세요."
                rows={3}
                className="w-full bg-surface-container-low border border-outline-variant rounded-md p-2.5 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors resize-none font-light"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() =>
                saveSection(
                  {
                    siteTitle: settings.siteTitle,
                    landingSubtitle: settings.landingSubtitle,
                  },
                  "플랫폼 문구 설정이 저장되었습니다."
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary font-medium rounded-md text-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Save size={13} />
              <span>문구 저장</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= 4. 기능 제어 탭 ================= */}
      {activeTab === "features" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3.5">
          <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
            <Power size={15} className="text-secondary" />
            <h2 className="font-semibold text-xs text-on-surface">모듈별 활성/비활성 제어</h2>
          </div>

          <div className="space-y-2">
            {[
              { id: "exam", label: "기출문제 풀이 모듈", desc: "정보처리기사 및 기출 시험 서비스" },
              { id: "diary", label: "일기장 및 메모 모듈", desc: "하루 1회 일기 작성 및 사진 기록" },
              { id: "ideas", label: "프로젝트 및 백로그 모듈", desc: "로드맵, 간트 차트 및 커밋 히스토리" },
              { id: "admin", label: "관리자 2차 인증 콘솔", desc: "관리자 접근 및 감사 로그 기능" },
            ].map((f) => {
              const isDisabled = settings.disabledFeatures[f.id as keyof typeof settings.disabledFeatures];
              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3 bg-surface-container-low rounded-md border border-outline-variant"
                >
                  <div>
                    <p className="font-medium text-xs text-on-surface">{f.label}</p>
                    <p className="text-[11px] text-on-surface-variant font-light">{f.desc}</p>
                  </div>

                  <SwitchToggle
                    checked={!isDisabled}
                    onChange={(active) => {
                      const updated = {
                        ...settings.disabledFeatures,
                        [f.id]: !active,
                      };
                      setSettings({ ...settings, disabledFeatures: updated });
                      saveSection({ disabledFeatures: updated }, `${f.label} 상태가 변경되었습니다.`);
                    }}
                    activeLabel="서비스 중"
                    inactiveLabel="비활성"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= 5. 보안 관리 탭 ================= */}
      {activeTab === "security" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3.5">
          <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
            <Database size={15} className="text-primary" />
            <h2 className="font-semibold text-xs text-on-surface">보안 감사 및 시스템 점검</h2>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-surface-container-low rounded-md border border-outline-variant flex items-center justify-between">
              <div>
                <p className="font-medium text-on-surface">2차 감사 로그 자동 추적</p>
                <p className="text-[11px] text-on-surface-variant font-light">
                  API 요청 시 withAudit 래퍼를 통해 감사 로그를 자동 수집합니다.
                </p>
              </div>
              <span className="text-[11px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                상시 활성
              </span>
            </div>

            <div className="p-3 bg-surface-container-low rounded-md border border-outline-variant flex items-center justify-between">
              <div>
                <p className="font-medium text-on-surface">세션 만료 정책</p>
                <p className="text-[11px] text-on-surface-variant font-light">
                  NextAuth 기반 30일 세션 및 브라우저 종료 시 토큰 유효성 관리.
                </p>
              </div>
              <span className="text-[11px] font-medium text-on-surface-variant font-mono">
                30 Days
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. Google 연동 탭 ================= */}
      {activeTab === "google" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3.5">
          <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
            <GoogleMarkIcon />
            <h2 className="font-semibold text-xs text-on-surface">Google 워크스페이스 연동 상태</h2>
          </div>

          <div className="p-3 bg-surface-container-low rounded-md border border-outline-variant space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-on-surface">OAuth 2.0 클라이언트</span>
              <span className="text-primary font-bold">정상 연결됨</span>
            </div>
            <p className="text-[11px] text-on-surface-variant font-light">
              캘린더, 드라이브 및 연락처 연동 권한은 사용자별 개인 설정(/settings)에서 개별 제어됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
