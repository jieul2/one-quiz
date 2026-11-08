"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SlidersHorizontal, Sliders, Target, Bell, Terminal, RefreshCw } from "lucide-react";
import { SwitchToggle } from "../common/SwitchToggle";
import { useSettings } from "../SettingsContext";
import { toast } from "@/lib/toast";

export interface AdminSettingsType {
  siteTitle: string;
  landingSubtitle: string;
  // 스터디 & 학습 정책
  studyGoalQuestions: number;
  pomodoroDefaultMinutes: number;
  examDefaultTimeLimit: number;
  enableOnboardingGuide: boolean;
  // 시스템 공지사항 상단 배너
  enableNoticeBanner: boolean;
  noticeBannerText: string;
  noticeBannerType: "info" | "event" | "alert";
  // 감사 로그 보존 정책 (일 단위)
  logRetentionDays: number;
}

export function AdminSystemSettingsModule() {
  const { markSaved, setSaveStatus } = useSettings();

  const [adminSettings, setAdminSettings] = useState<AdminSettingsType>({
    siteTitle: "원퀴즈 (OneQuiz)",
    landingSubtitle: "혼자서 공부하는 수험생을 위한 올인원 스터디 플랫폼",
    studyGoalQuestions: 20,
    pomodoroDefaultMinutes: 25,
    examDefaultTimeLimit: 60,
    enableOnboardingGuide: true,
    enableNoticeBanner: false,
    noticeBannerText: "2026 자격증/기출문제 신규 모의고사가 업데이트되었습니다!",
    noticeBannerType: "info",
    logRetentionDays: 90,
  });
  const [isLoadingAdminSettings, setIsLoadingAdminSettings] = useState(true);

  const loadAdminSettings = useCallback(async () => {
    setIsLoadingAdminSettings(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setAdminSettings({
          siteTitle: data.siteTitle || "원퀴즈 (OneQuiz)",
          landingSubtitle: data.landingSubtitle || "",
          studyGoalQuestions: Number(data.studyGoalQuestions) || 20,
          pomodoroDefaultMinutes: Number(data.pomodoroDefaultMinutes) || 25,
          examDefaultTimeLimit: Number(data.examDefaultTimeLimit) || 60,
          enableOnboardingGuide: data.enableOnboardingGuide !== false,
          enableNoticeBanner: !!data.enableNoticeBanner,
          noticeBannerText: data.noticeBannerText || "",
          noticeBannerType: data.noticeBannerType || "info",
          logRetentionDays: Number(data.logRetentionDays) || 90,
        });
      }
    } catch {
      toast.error("운영 설정을 불러오지 못했습니다.");
    } finally {
      setIsLoadingAdminSettings(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok && !ignore) {
          const data = await res.json();
          setAdminSettings({
            siteTitle: data.siteTitle || "원퀴즈 (OneQuiz)",
            landingSubtitle: data.landingSubtitle || "",
            studyGoalQuestions: Number(data.studyGoalQuestions) || 20,
            pomodoroDefaultMinutes: Number(data.pomodoroDefaultMinutes) || 25,
            examDefaultTimeLimit: Number(data.examDefaultTimeLimit) || 60,
            enableOnboardingGuide: data.enableOnboardingGuide !== false,
            enableNoticeBanner: !!data.enableNoticeBanner,
            noticeBannerText: data.noticeBannerText || "",
            noticeBannerType: data.noticeBannerType || "info",
            logRetentionDays: Number(data.logRetentionDays) || 90,
          });
        }
      } catch {
        if (!ignore) toast.error("운영 설정을 불러오지 못했습니다.");
      } finally {
        if (!ignore) setIsLoadingAdminSettings(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const saveAdminSettings = async (payload: Partial<AdminSettingsType>, successMessage: string) => {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setAdminSettings((prev) => ({ ...prev, ...payload }));
        markSaved();
        toast.success(successMessage);
      } else {
        setSaveStatus("error");
        toast.error("운영 설정 저장 중 오류가 발생했습니다.");
      }
    } catch {
      setSaveStatus("error");
      toast.error("서버 통신 실패");
    }
  };

  return (
    <div className="space-y-3.5">
      {/* 헤더 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <SlidersHorizontal size={18} />
          </div>
          <div>
            <h2 className="ui-section-title text-on-surface">시스템 운영 및 서비스 제어</h2>
            <p className="ui-caption text-on-surface-variant">
              사이트 브랜딩, 학습 정책, 시스템 공지 배너를 실시간으로 관리합니다.
            </p>
          </div>
        </div>

        <button
          onClick={loadAdminSettings}
          disabled={isLoadingAdminSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface ui-caption font-medium transition-colors cursor-pointer"
        >
          <RefreshCw size={12} className={isLoadingAdminSettings ? "animate-spin text-primary" : ""} />
          <span>새로고침</span>
        </button>
      </div>

      {/* 1. 사이트 타이틀 및 브랜딩 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-outline-variant pb-2.5">
          <Sliders size={16} className="text-primary" />
          <h3 className="ui-card-title text-on-surface">사이트 브랜딩 설정</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="ui-caption font-semibold text-on-surface block mb-1">
              사이트 대표 제목 (Title)
            </label>
            <input
              type="text"
              value={adminSettings.siteTitle}
              onChange={(e) => setAdminSettings((prev) => ({ ...prev, siteTitle: e.target.value }))}
              className="w-full bg-surface-container-low px-3 py-2 rounded-md border border-outline-variant ui-body text-on-surface focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="ui-caption font-semibold text-on-surface block mb-1">
              랜딩 페이지 보조 문구 (Subtitle)
            </label>
            <input
              type="text"
              value={adminSettings.landingSubtitle}
              onChange={(e) => setAdminSettings((prev) => ({ ...prev, landingSubtitle: e.target.value }))}
              placeholder="예: 혼자서 공부하는 수험생을 위한 올인원 스터디 플랫폼"
              className="w-full bg-surface-container-low px-3 py-2 rounded-md border border-outline-variant ui-body text-on-surface focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <button
            onClick={() => {
              saveAdminSettings(
                {
                  siteTitle: adminSettings.siteTitle,
                  landingSubtitle: adminSettings.landingSubtitle,
                },
                "사이트 브랜딩 정보가 저장되었습니다."
              );
            }}
            className="px-4 py-2 rounded-md bg-primary text-on-primary ui-button font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            브랜딩 저장
          </button>
        </div>
      </div>

      {/* 2. 스터디 & 수험 정책 설정 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-outline-variant pb-2.5">
          <Target size={16} className="text-primary" />
          <h3 className="ui-card-title text-on-surface">스터디 & 수험 정책 설정</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 일일 권장 문제풀이 수 */}
          <div className="space-y-1.5">
            <label className="ui-caption font-semibold text-on-surface block">
              일일 권장 문제풀이 목표량 (문제)
            </label>
            <div className="flex items-center gap-2">
              {[10, 20, 30, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setAdminSettings((prev) => ({ ...prev, studyGoalQuestions: num }))}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    adminSettings.studyGoalQuestions === num
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-low border border-outline-variant text-on-surface hover:bg-surface-container"
                  }`}
                >
                  {num}문제
                </button>
              ))}
            </div>
          </div>

          {/* 모의고사 기본 제한시간 */}
          <div className="space-y-1.5">
            <label className="ui-caption font-semibold text-on-surface block">
              모의고사 기본 제한시간 (분)
            </label>
            <div className="flex items-center gap-2">
              {[30, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setAdminSettings((prev) => ({ ...prev, examDefaultTimeLimit: mins }))}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    adminSettings.examDefaultTimeLimit === mins
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-low border border-outline-variant text-on-surface hover:bg-surface-container"
                  }`}
                >
                  {mins}분
                </button>
              ))}
            </div>
          </div>

          {/* 신규 학습자 온보딩 가이드 툴팁 */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant">
            <div>
              <p className="ui-card-title text-on-surface">온보딩 가이드</p>
              <p className="ui-caption text-on-surface-variant font-light">
                첫 방문 회원에게 핵심 기능 안내 툴팁 표시
              </p>
            </div>
            <SwitchToggle
              checked={adminSettings.enableOnboardingGuide}
              onChange={(val) => setAdminSettings((prev) => ({ ...prev, enableOnboardingGuide: val }))}
            />
          </div>
        </div>

        <button
          onClick={() => {
            saveAdminSettings(
              {
                studyGoalQuestions: adminSettings.studyGoalQuestions,
                pomodoroDefaultMinutes: adminSettings.pomodoroDefaultMinutes,
                examDefaultTimeLimit: adminSettings.examDefaultTimeLimit,
                enableOnboardingGuide: adminSettings.enableOnboardingGuide,
              },
              "스터디 및 수험 정책이 저장되었습니다."
            );
          }}
          className="px-4 py-2 rounded-md bg-primary text-on-primary ui-button font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          정책 설정 저장
        </button>
      </div>

      {/* 3. 시스템 공지사항 상단 배너 설정 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-outline-variant pb-2.5">
          <Bell size={16} className="text-primary" />
          <h3 className="ui-card-title text-on-surface">시스템 공지사항 상단 배너</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant">
            <div>
              <p className="ui-card-title text-on-surface">공지사항 배너 활성화</p>
              <p className="ui-caption text-on-surface-variant font-light">
                모든 페이지 상단에 중요한 공지 안내 배너를 고정 노출합니다.
              </p>
            </div>
            <SwitchToggle
              checked={adminSettings.enableNoticeBanner}
              onChange={(val) => setAdminSettings((prev) => ({ ...prev, enableNoticeBanner: val }))}
            />
          </div>

          {adminSettings.enableNoticeBanner && (
            <div className="space-y-3 pl-1 pt-1 animate-fade-in">
              <div>
                <label className="ui-caption font-semibold text-on-surface block mb-1">
                  공지 안내 문구
                </label>
                <input
                  type="text"
                  value={adminSettings.noticeBannerText}
                  onChange={(e) => setAdminSettings((prev) => ({ ...prev, noticeBannerText: e.target.value }))}
                  placeholder="예: 2026 자격증/기출문제 신규 모의고사가 업데이트되었습니다!"
                  className="w-full bg-surface-container-low px-3 py-2 rounded-md border border-outline-variant ui-body text-on-surface focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="ui-caption font-semibold text-on-surface block mb-1.5">
                  배너 스타일 유형
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { id: "info", label: "안내 (Info)", color: "border-blue-500 text-blue-500" },
                    { id: "event", label: "이벤트 (Event)", color: "border-purple-500 text-purple-500" },
                    { id: "alert", label: "긴급 (Alert)", color: "border-rose-500 text-rose-500" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setAdminSettings((prev) => ({
                          ...prev,
                          noticeBannerType: t.id as "info" | "event" | "alert",
                        }))
                      }
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors border ${
                        adminSettings.noticeBannerType === t.id
                          ? "bg-primary text-on-primary border-primary"
                          : `bg-surface-container-low ${t.color} hover:bg-surface-container`
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              saveAdminSettings(
                {
                  enableNoticeBanner: adminSettings.enableNoticeBanner,
                  noticeBannerText: adminSettings.noticeBannerText,
                  noticeBannerType: adminSettings.noticeBannerType,
                },
                "공지사항 배너 설정이 저장되었습니다."
              );
            }}
            className="px-4 py-2 rounded-md bg-primary text-on-primary ui-button font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            공지 배너 저장
          </button>
        </div>
      </div>

      {/* 4. 감사 로그 보존 정책 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-outline-variant pb-2.5">
          <Terminal size={16} className="text-primary" />
          <h3 className="ui-card-title text-on-surface">보안 및 감사 로그 보존 정책</h3>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="ui-caption font-semibold text-on-surface block">
              로그 보존 기간 (이후 오래된 로그 자동 아카이빙)
            </label>
            <div className="flex items-center gap-2">
              {[30, 90, 180, 365].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setAdminSettings((prev) => ({ ...prev, logRetentionDays: days }))}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    adminSettings.logRetentionDays === days
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-low border border-outline-variant text-on-surface hover:bg-surface-container"
                  }`}
                >
                  {days}일
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              saveAdminSettings(
                { logRetentionDays: adminSettings.logRetentionDays },
                "로그 보존 기간이 저장되었습니다."
              );
            }}
            className="px-4 py-2 rounded-md bg-primary text-on-primary ui-button font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            보존 정책 저장
          </button>
        </div>
      </div>
    </div>
  );
}
