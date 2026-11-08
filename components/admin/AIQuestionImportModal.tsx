"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lock,
  RotateCcw,
  BookOpen,
  Calendar,
  Layers,
  Loader2,
  Copy,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { toast } from "@/lib/toast";

export interface AIParsedQuestion {
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  subject: string;
  examType: string;
  isValid: boolean;
}

interface AIQuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubject?: string;
  defaultExamType?: string;
  subjectsList?: string[];
  examTypesList?: string[];
}

const SAMPLE_EXAM_TEXT = `1. 소프트웨어 아키텍처 설계에서 시스템 품질 속성 중 가용성(Availability)을 향상시키기 위한 아키텍처 접근법으로 가장 적절하지 않은 것은?
① 결함 탐지(Ping/Echo, Heartbeat) 기법을 적용한다.
② 결함 복구를 위해 능동적 여분(Active Redundancy)을 구성한다.
③ 시스템 부하 방지를 위해 예외 처리 루틴을 최소화한다.
④ 결함 예방을 위해 트랜잭션 롤백 메커니즘을 사용한다.
[정답] 3
[해설] 예외 처리 루틴을 최소화하면 오류 발생 시 시스템 중단(다운타임)으로 이어져 가용성이 저하됩니다. 가용성을 높이려면 철저한 예외 처리 및 장애 격리가 필요합니다.

2. 디자인 패턴 중 생성 패턴(Creational Pattern)에 속하지 않는 것은?
① 추상 팩토리(Abstract Factory)
② 빌더(Builder)
③ 싱글톤(Singleton)
④ 어댑터(Adapter)
[정답] 4
[해설] 어댑터(Adapter) 패턴은 클래스나 객체를 조합하여 더 큰 구조를 만드는 구조 패턴(Structural Pattern)에 해당합니다.

3. 데이터베이스 정규화 과정에서 제2정규형(2NF)에서 제3정규형(3NF)으로 진행하기 위해 제거해야 하는 종속성은?
① 부분 함수 종속성
② 이행적 함수 종속성
③ 다치 종속성
④ 조인 종속성
[정답] 2
[해설] 제3정규형은 제2정규형을 만족하고, 기본키에 대한 이행적 함수 종속성(A → B, B → C)을 제거한 정규형입니다.`;

export function AIQuestionImportModal({
  isOpen,
  onClose,
  defaultSubject = "소프트웨어공학",
  defaultExamType = "2024년 2회차",
  subjectsList = [],
  examTypesList = [],
}: AIQuestionImportModalProps) {
  const [subject, setSubject] = useState(defaultSubject);
  const [examType, setExamType] = useState(defaultExamType);
  const [rawText, setRawText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<AIParsedQuestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen) return null;

  // 샘플 텍스트 로드
  const handleLoadSample = () => {
    setRawText(SAMPLE_EXAM_TEXT);
    toast.success("시험지 원문 샘플 텍스트를 불러왔습니다.");
  };

  // AI 문항 분석 및 파싱 실행
  const handleParseText = () => {
    if (!rawText.trim()) {
      toast.warning("문서 스캔 텍스트 또는 PDF 복사 내용을 입력해주세요.");
      return;
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      try {
        const blocks = rawText
          .split(/\n(?=\d+[\.\s])/g)
          .map((b) => b.trim())
          .filter(Boolean);

        const results: AIParsedQuestion[] = [];

        blocks.forEach((block, idx) => {
          const lines = block
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          if (lines.length === 0) return;

          const firstLine = lines[0];
          const numMatch = firstLine.match(/^(\d+)[\.\s]\s*(.*)$/);
          const questionNumber = numMatch ? parseInt(numMatch[1], 10) : idx + 1;
          let questionText = numMatch ? numMatch[2] : firstLine;

          const options: string[] = [];
          let correctAnswer = 1;
          let explanation = "";

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];

            const ansMatch = line.match(/(?:\[정답\]|정답\s*[:：]|답\s*[:：])\s*([1-4①-④])/);
            if (ansMatch) {
              const val = ansMatch[1];
              if (val === "1" || val === "①") correctAnswer = 1;
              else if (val === "2" || val === "②") correctAnswer = 2;
              else if (val === "3" || val === "③") correctAnswer = 3;
              else if (val === "4" || val === "④") correctAnswer = 4;
              continue;
            }

            const expMatch = line.match(/(?:\[해설\]|해설\s*[:：])\s*(.*)/);
            if (expMatch) {
              explanation = expMatch[1];
              for (let j = i + 1; j < lines.length; j++) {
                explanation += " " + lines[j];
              }
              break;
            }

            const optMatch = line.match(/^[①②③④\d][\.\)]?\s*(.*)$/);
            if (optMatch && options.length < 4) {
              options.push(optMatch[1]);
            } else if (options.length === 0) {
              questionText += " " + line;
            }
          }

          while (options.length < 4) {
            options.push(`보기 ${options.length + 1}`);
          }

          results.push({
            questionNumber,
            questionText,
            options,
            correctAnswer,
            explanation: explanation || "등록된 해설이 없습니다.",
            subject: subject.trim() || defaultSubject,
            examType: examType.trim() || defaultExamType,
            isValid: options.length === 4 && Boolean(questionText),
          });
        });

        setParsedQuestions(results);
        setIsAnalyzing(false);
        if (results.length > 0) {
          toast.success(`AI 분석 완료: 총 ${results.length}개 문항이 성공적으로 파싱되었습니다.`);
        } else {
          toast.warning("문항 번호(1., 2. 등)를 감지하지 못했습니다. 형식을 확인해주세요.");
        }
      } catch {
        setIsAnalyzing(false);
        toast.error("텍스트 분석 중 오류가 발생했습니다.");
      }
    }, 350);
  };

  const validCount = parsedQuestions.filter((q) => q.isValid).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in select-none">
      <div
        className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col justify-between overflow-hidden text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. 모달 상단 헤더 */}
        <div className="p-4 sm:p-5 border-b border-outline-variant flex items-center justify-between bg-surface-container-low/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-on-surface truncate">
                  AI 기출문제 자동 등록
                </h3>
                <span className="ui-badge px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 font-mono text-[10px] font-bold">
                  기능 준비 중 (Phase 2)
                </span>
              </div>
              <p className="ui-caption text-on-surface-variant font-light truncate mt-0.5">
                시험지 스캔 텍스트나 PDF 복사본을 붙여넣으면 양식에 맞춰 문항을 추출하고 미리보기로 검증합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. 모달 바디 스크롤 영역 */}
        <ScrollArea maxHeight="calc(92vh - 145px)" className="p-4 sm:p-6 space-y-5">
          {/* 기능 준비 중 안내 배너 */}
          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-2.5 text-xs text-on-surface">
            <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-primary">현재 AI 문항 파싱 사전 검증 미리보기 단계입니다</p>
              <p className="text-on-surface-variant leading-relaxed">
                문서 스캔 텍스트나 PDF에서 복사한 내용을 붙여넣으면 AI가 <strong>문제, 보기 1~4번, 정답, 해설</strong>을 양식에 맞춰 자동 추출합니다. 하단의 문항별 카드(1번, 2번, 3번...)를 통해 등록 전 정합성을 확인할 수 있으며, DB 일괄 저장은 추후 AI 모델 연동 시 활성화됩니다.
              </p>
            </div>
          </div>

          {/* 메타데이터 설정 (과목 & 회차) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs">
            <div>
              <label className="block font-semibold text-on-surface mb-1 flex items-center gap-1">
                <BookOpen size={13} className="text-primary" />
                <span>등록 대상 과목</span>
              </label>
              {subjectsList.length > 0 ? (
                <div className="flex gap-1.5">
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="flex-1 p-2 bg-surface-container-lowest border border-outline-variant rounded-md text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
                  >
                    {subjectsList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="직접 입력"
                    className="w-28 p-2 bg-surface-container-lowest border border-outline-variant rounded-md text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="예: 소프트웨어공학"
                  className="w-full p-2 bg-surface-container-lowest border border-outline-variant rounded-md text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              )}
            </div>

            <div>
              <label className="block font-semibold text-on-surface mb-1 flex items-center gap-1">
                <Calendar size={13} className="text-primary" />
                <span>등록 대상 기출 회차</span>
              </label>
              {examTypesList.length > 0 ? (
                <div className="flex gap-1.5">
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="flex-1 p-2 bg-surface-container-lowest border border-outline-variant rounded-md text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
                  >
                    {examTypesList.map((et) => (
                      <option key={et} value={et}>
                        {et}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    placeholder="직접 입력"
                    className="w-28 p-2 bg-surface-container-lowest border border-outline-variant rounded-md text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  placeholder="예: 2024년 2회차"
                  className="w-full p-2 bg-surface-container-lowest border border-outline-variant rounded-md text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              )}
            </div>
          </div>

          {/* 원문 텍스트 입력 영역 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <FileText size={14} className="text-primary" />
                <span>스캔 문서 / PDF 원문 텍스트 붙여넣기</span>
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Copy size={11} />
                  <span>샘플 텍스트 채우기</span>
                </button>
                {rawText && (
                  <button
                    type="button"
                    onClick={() => {
                      setRawText("");
                      setParsedQuestions([]);
                    }}
                    className="px-2 py-1 rounded-md text-[11px] font-semibold text-on-surface-variant hover:text-destructive hover:bg-surface-container transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw size={11} />
                    <span>초기화</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`스캔한 시험지 텍스트나 PDF에서 복사한 원문을 이곳에 붙여넣으세요.
예시:
1. 소프트웨어 생명주기 모델 중 나선형 모델의 특징이 아닌 것은?
① 위험 분석 단계가 존재한다.
② 프로토타입 모델의 장점을 결합했다.
③ 대규모 시스템 개발에 적합하다.
④ 단계별 검증 없이 일괄 배포한다.
[정답] 4
[해설] 나선형 모델은 위험 분석을 반복하며 점진적으로 개발하는 모델입니다.`}
              rows={7}
              className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary leading-relaxed resize-y"
            />

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleParseText}
                disabled={isAnalyzing || !rawText.trim()}
                className="px-4 py-2 rounded-xl bg-primary hover:opacity-90 disabled:opacity-40 text-on-primary text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>AI 문항 분석 및 구조화 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>AI 문항 분석 및 파싱하기</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. 추출된 문항 사전 검증 미리보기 영역 (1번, 2번, 3번...) */}
          <div className="space-y-3 pt-2 border-t border-outline-variant/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs sm:text-sm text-on-surface flex items-center gap-1.5">
                  <Layers size={15} className="text-primary" />
                  <span>추출된 문항 정합성 미리보기</span>
                </h4>
                {parsedQuestions.length > 0 && (
                  <span className="ui-badge px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-[11px] font-bold">
                    총 {parsedQuestions.length}문항 (검증 통과 {validCount}개)
                  </span>
                )}
              </div>
            </div>

            {parsedQuestions.length === 0 ? (
              <div className="py-12 px-4 rounded-xl bg-surface-container-low/40 border border-dashed border-outline-variant text-center space-y-1.5">
                <HelpCircle size={22} className="mx-auto text-on-surface-variant/60" />
                <p className="font-bold text-xs text-on-surface">분석된 문항이 없습니다</p>
                <p className="ui-caption text-on-surface-variant font-light max-w-sm mx-auto">
                  상단에 시험지 텍스트를 입력하고 <strong>[AI 문항 분석 및 파싱하기]</strong> 버튼을 누르면 번호별(1번, 2번, 3번...) 카드 미리보기가 생성됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {parsedQuestions.map((q) => (
                  <div
                    key={q.questionNumber}
                    className="p-4 rounded-xl bg-surface-container-low border border-outline-variant space-y-3 shadow-2xs hover:border-primary/40 transition-colors"
                  >
                    {/* 카드 상단 번호 & 상태 뱃지 */}
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-primary text-on-primary font-bold font-mono text-xs">
                          {q.questionNumber}번 문항
                        </span>
                        <span className="ui-badge px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono">
                          {q.subject} · {q.examType}
                        </span>
                      </div>

                      {q.isValid ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                          <CheckCircle2 size={12} /> 파싱 검증 완료
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <AlertCircle size={12} /> 보기 확인 필요
                        </span>
                      )}
                    </div>

                    {/* 문제 지문 */}
                    <p className="text-xs sm:text-sm font-semibold text-on-surface leading-relaxed">
                      {q.questionText}
                    </p>

                    {/* 보기 1~4번 (정답 강조) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt, optIdx) => {
                        const optNumber = optIdx + 1;
                        const isCorrect = q.correctAnswer === optNumber;
                        const circleSymbols = ["①", "②", "③", "④"];

                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-all ${
                              isCorrect
                                ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                                : "bg-surface-container-lowest border-outline-variant/60 text-on-surface"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-xs shrink-0">
                                {circleSymbols[optIdx] || `${optNumber}.`}
                              </span>
                              <span className="truncate">{opt}</span>
                            </div>
                            {isCorrect && (
                              <span className="ui-badge text-[10px] px-1.5 py-0.2 rounded-md bg-primary text-on-primary shrink-0 font-bold">
                                정답
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 해설 박스 */}
                    {q.explanation && (
                      <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/60 text-xs text-on-surface-variant flex items-start gap-1.5">
                        <span className="font-bold text-primary shrink-0">💡 해설:</span>
                        <span className="leading-relaxed">{q.explanation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 3. 모달 하단 액션 바 */}
        <div className="p-4 sm:p-5 border-t border-outline-variant bg-surface-container-low/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Lock size={13} className="text-amber-500 shrink-0" />
            <span>
              {parsedQuestions.length > 0
                ? `총 ${parsedQuestions.length}개 문항 감지됨 (현재 DB 저장은 비활성화 상태)`
                : "스캔/PDF 텍스트를 입력하고 분석을 먼저 진행해주세요."}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors cursor-pointer"
            >
              닫기
            </button>

            {/* 현재 비활성화된 일괄 등록 버튼 (사용자 요구사항 반영) */}
            <button
              type="button"
              disabled={true}
              onClick={() => {
                toast.info("현재 AI 추출 엔진 연동 준비 중입니다. 문항 파싱 미리보기만 이용 가능합니다.");
              }}
              className="px-5 py-2 rounded-xl bg-primary/40 text-on-primary/70 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-not-allowed opacity-60"
              title="AI 엔진 정식 연동 시 활성화됩니다"
            >
              <Lock size={13} />
              <span>
                {parsedQuestions.length > 0
                  ? `${parsedQuestions.length}개 문항 일괄 등록 (현재 비활성화)`
                  : "일괄 등록 (현재 비활성화)"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
