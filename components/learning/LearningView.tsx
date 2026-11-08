"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Flame,
  Clock,
  Target,
  CalendarDays,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Award,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface HeatmapDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  studyMinutes: number;
  questionsSolved: number;
  diaryWritten: boolean;
}

interface LearningStats {
  currentStreak: number;
  longestStreak: number;
  totalStudyMinutes: number;
  totalStudyHours: number;
  totalQuestionsSolved: number;
  totalQuestionsCorrect: number;
  overallAccuracy: number;
  monthlyActiveDays: number;
}

interface SubjectStat {
  subject: string;
  solved: number;
  correct: number;
  accuracy: number;
}

interface ActivityItem {
  type: string;
  title: string;
  timestamp: string;
}

export function LearningView() {
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [stats, setStats] = useState<LearningStats>({
    currentStreak: 0,
    longestStreak: 0,
    totalStudyMinutes: 0,
    totalStudyHours: 0,
    totalQuestionsSolved: 0,
    totalQuestionsCorrect: 0,
    overallAccuracy: 0,
    monthlyActiveDays: 0,
  });
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  // 데이터 로드
  const fetchLearningData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/learning-log");
      if (res.ok) {
        const data = await res.json();
        setHeatmap(data.heatmap || []);
        setStats(
          data.stats || {
            currentStreak: 0,
            longestStreak: 0,
            totalStudyMinutes: 0,
            totalStudyHours: 0,
            totalQuestionsSolved: 0,
            totalQuestionsCorrect: 0,
            overallAccuracy: 0,
            monthlyActiveDays: 0,
          }
        );
        setSubjectStats(data.subjectStats || []);
        setRecentActivities(data.recentActivities || []);
      }
    } catch (e) {
      console.error("Failed to fetch learning log data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/learning-log");
        if (res.ok && !ignore) {
          const data = await res.json();
          setHeatmap(data.heatmap || []);
          if (data.stats) setStats(data.stats);
          setSubjectStats(data.subjectStats || []);
          setRecentActivities(data.recentActivities || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  // 히트맵 7행(요일)별 주차 그리드 분할
  const heatmapWeeks = useMemo(() => {
    const weeks: HeatmapDay[][] = [];
    let currentWeek: HeatmapDay[] = [];

    heatmap.forEach((day, idx) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || idx === heatmap.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    return weeks;
  }, [heatmap]);

  return (
    <div className="w-full space-y-6 text-on-surface">
      {/* ================= 최상단 헤더 ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="ui-page-title">러닝기록 & 학습 진도</h1>
            <span className="ui-badge px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
              <Sparkles size={12} />
              <span>Study Analytics</span>
            </span>
          </div>
          <p className="ui-page-subtitle mt-0.5">
            학습 잔디, 스트릭, 기출문제 정답률 및 과목별 취약 영역 분석을 통해 나의 성장을 확인하세요.
          </p>
        </div>

        <button
          onClick={fetchLearningData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface ui-caption font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin text-primary" : ""} />
          <span>새로고침</span>
        </button>
      </div>

      {/* ================= 1. 핵심 4대 통계 카드 ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 카드 1: 현재 스트릭 */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4.5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="ui-caption font-medium text-on-surface-variant flex items-center gap-1.5">
              <Flame size={14} className="text-amber-500" />
              <span>연속 학습 스트릭</span>
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-on-surface font-mono tracking-tight">
                {stats.currentStreak}
              </span>
              <span className="ui-caption font-bold text-primary">일 연속</span>
            </div>
            <p className="ui-caption text-on-surface-variant">
              역대 최장 기록: <strong className="text-on-surface">{stats.longestStreak}일</strong>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Flame size={24} />
          </div>
        </div>

        {/* 카드 2: 누적 집중 공부 시간 */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4.5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="ui-caption font-medium text-on-surface-variant flex items-center gap-1.5">
              <Clock size={14} className="text-primary" />
              <span>누적 집중 공부 시간</span>
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-on-surface font-mono tracking-tight">
                {stats.totalStudyHours}
              </span>
              <span className="ui-caption font-bold text-primary">시간</span>
            </div>
            <p className="ui-caption text-on-surface-variant">
              총 {stats.totalStudyMinutes}분 스터디 세션 누적
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Clock size={24} />
          </div>
        </div>

        {/* 카드 3: 기출문제 누적 정답률 */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4.5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="ui-caption font-medium text-on-surface-variant flex items-center gap-1.5">
              <Target size={14} className="text-emerald-500" />
              <span>기출문제 정답률</span>
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-on-surface font-mono tracking-tight">
                {stats.overallAccuracy}%
              </span>
              <span className="ui-caption text-on-surface-variant">
                ({stats.totalQuestionsCorrect}/{stats.totalQuestionsSolved})
              </span>
            </div>
            <p className="ui-caption text-on-surface-variant">
              총 {stats.totalQuestionsSolved}문항 풀이 완료
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Target size={24} />
          </div>
        </div>

        {/* 카드 4: 이번 달 출석 일수 */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4.5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="ui-caption font-medium text-on-surface-variant flex items-center gap-1.5">
              <CalendarDays size={14} className="text-secondary" />
              <span>이번 달 학습 일수</span>
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-on-surface font-mono tracking-tight">
                {stats.monthlyActiveDays}
              </span>
              <span className="ui-caption font-bold text-secondary">일 활동</span>
            </div>
            <p className="ui-caption text-on-surface-variant">
              월간 달성률: {Math.round((stats.monthlyActiveDays / 30) * 100)}%
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center font-bold">
            <CalendarDays size={24} />
          </div>
        </div>
      </div>

      {/* ================= 2. 깃허브 스타일 학습 잔디 (Heatmap) ================= */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="ui-section-title text-on-surface">학습 잔디 (Activity Heatmap)</h2>
          </div>
          <span className="ui-caption text-on-surface-variant">
            최근 180일간의 학습 활동 빈도
          </span>
        </div>

        {/* 잔디 그리드 컨테이너 (가로 스크롤 가능) */}
        <div className="relative overflow-x-auto pb-2 scrollbar-thin">
          <div className="inline-flex gap-1.5 p-1">
            {heatmapWeeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map((day) => {
                  const levelClasses: Record<number, string> = {
                    0: "bg-surface-container-low border border-outline-variant/60 hover:ring-2 hover:ring-primary/40",
                    1: "bg-primary/25 border border-primary/30 hover:ring-2 hover:ring-primary",
                    2: "bg-primary/50 border border-primary/50 hover:ring-2 hover:ring-primary",
                    3: "bg-primary/75 border border-primary/70 hover:ring-2 hover:ring-primary",
                    4: "bg-primary border border-primary hover:ring-2 hover:ring-white shadow-xs",
                  };

                  return (
                    <div
                      key={day.date}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs transition-all cursor-pointer ${
                        levelClasses[day.level] || levelClasses[0]
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* 마우스 호버 일자 정보 팝오버 배지 */}
          <div className="min-h-[28px] mt-2 flex items-center justify-between text-xs border-t border-outline-variant/60 pt-2">
            <div>
              {hoveredDay ? (
                <span className="ui-caption text-on-surface font-medium animate-in fade-in duration-100">
                  <strong className="text-primary font-mono">{hoveredDay.date}</strong>:{" "}
                  {hoveredDay.count > 0 ? (
                    <>
                      활동 점수 <strong>{hoveredDay.count}점</strong> (문제 {hoveredDay.questionsSolved}개,{" "}
                      일기 {hoveredDay.diaryWritten ? "작성됨" : "없음"}, 집중 {hoveredDay.studyMinutes}분)
                    </>
                  ) : (
                    "학습 활동 없음"
                  )}
                </span>
              ) : (
                <span className="ui-caption text-on-surface-variant font-light">
                  잔디 칸에 마우스를 올리면 상세 학습 내역을 볼 수 있습니다.
                </span>
              )}
            </div>

            {/* 범례 (Less -> More) */}
            <div className="flex items-center gap-1.5 ui-caption text-on-surface-variant">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded-xs bg-surface-container-low border border-outline-variant" />
              <div className="w-2.5 h-2.5 rounded-xs bg-primary/25 border border-primary/30" />
              <div className="w-2.5 h-2.5 rounded-xs bg-primary/50 border border-primary/50" />
              <div className="w-2.5 h-2.5 rounded-xs bg-primary/75 border border-primary/70" />
              <div className="w-2.5 h-2.5 rounded-xs bg-primary" />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 3. 과목별 정답률 분석 & 최근 학습 활동 피드 2열 레이아웃 ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= 좌측: 과목별 정답률 & 취약 영역 분석 ================= */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-primary" />
              <h2 className="ui-section-title text-on-surface">과목별 정답률 & 취약점 분석</h2>
            </div>
            <Link
              href="/exam/subject"
              className="ui-caption font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>문제 풀러 가기</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {subjectStats.length === 0 ? (
            <div className="py-12 ui-empty-state">
              아직 풀이한 기출문제 이력이 없습니다. 기출문제를 풀면 과목별 정답률이 자동 집계됩니다.
            </div>
          ) : (
            <div className="space-y-3.5">
              {subjectStats.map((sub) => {
                const isWeak = sub.solved >= 3 && sub.accuracy < 60;
                return (
                  <div key={sub.subject} className="space-y-1.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="ui-card-title text-on-surface">{sub.subject}</span>
                        {isWeak && (
                          <span className="ui-badge px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/30">
                            집중 복습 필요
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ui-caption font-mono">
                        <span className="text-on-surface font-bold">{sub.accuracy}%</span>
                        <span className="text-on-surface-variant">({sub.correct}/{sub.solved}문항)</span>
                      </div>
                    </div>

                    {/* 정답률 프로그레스 바 */}
                    <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, Math.max(5, sub.accuracy))}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          sub.accuracy >= 80
                            ? "bg-emerald-500"
                            : sub.accuracy >= 60
                            ? "bg-primary"
                            : "bg-rose-500"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= 우측: 최근 학습 활동 이력 피드 ================= */}
        <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              <h2 className="ui-section-title text-on-surface">최근 학습 활동 피드</h2>
            </div>
            <span className="ui-badge px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
              Recent Feed
            </span>
          </div>

          {recentActivities.length === 0 ? (
            <div className="py-8 ui-empty-state">
              아직 기록된 최근 학습 활동이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/60 max-h-[380px] overflow-y-auto pr-1">
              {recentActivities.map((act, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <CheckCircle2 size={14} />
                    </div>
                    <span className="ui-body text-on-surface truncate font-medium">{act.title}</span>
                  </div>
                  <span className="ui-caption text-on-surface-variant whitespace-nowrap font-mono shrink-0">
                    {new Date(act.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
