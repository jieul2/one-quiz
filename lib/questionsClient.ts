export interface HistoryAttempt {
  isCorrect: boolean;
  timestamp: string | Date;
}

export interface QuestionItem {
  _id: string;
  subject: string;
  examType: string;
  questionNumber: number;
  questionType?: "multiple-choice" | "short-answer";
  title: string;
  codeSnippet?: string;
  options?: string[];
  correctAnswer: string[] | string;
  explanation?: string;
  isActive?: boolean;
  history?: HistoryAttempt[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

let cachedQuestions: QuestionItem[] | null = null;
let inFlightPromise: Promise<QuestionItem[]> | null = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 60 * 1000; // 60초 캐싱 (연속 페이지 이동 시 중복 네트워크 호출 차단)

/**
 * 기출문제 목록 조회 함수 (메모리 캐싱 및 In-Flight 프로미스 중복 호출 차단 적용)
 */
export async function getQuestions(forceRefresh = false): Promise<QuestionItem[]> {
  const now = Date.now();
  if (!forceRefresh && cachedQuestions && now - lastFetchedAt < CACHE_TTL_MS) {
    return cachedQuestions;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const res = await fetch("/api/questions", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to fetch questions: ${res.statusText}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        cachedQuestions = data;
        lastFetchedAt = Date.now();
        return data;
      }
      return [];
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

/**
 * 관리자 변경 사항 발생 시 캐시 무효화
 */
export function invalidateQuestionsCache() {
  cachedQuestions = null;
  lastFetchedAt = 0;
  inFlightPromise = null;
}

/**
 * 풀이 이력(정답/오답) 발생 시 캐시 내 이력 동기화
 */
export function updateCachedQuestionHistory(questionId: string, history: HistoryAttempt[]) {
  if (!cachedQuestions) return;
  cachedQuestions = cachedQuestions.map((q) => (q._id === questionId ? { ...q, history } : q));
}
