import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Question from '@/models/Question';
import QuestionAttempt from '@/models/QuestionAttempt';
import LearningLog from '@/models/LearningLog';
import { withAudit } from '@/lib/withAudit';

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 1. 문제 목록 조회 (단건 조회 / 전체 조회 / 서버 사이드 페이지네이션 및 과목별 통계)
async function handleGet(req: Request) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;

  // 특정 ID로 조회를 요청한 경우 단건 반환 (유저별 풀이 이력 매핑)
  if (id) {
    const question = await Question.findById(id).lean();
    if (!question) {
      return NextResponse.json({ error: '문제를 찾을 수 없습니다.' }, { status: 404 });
    }
    if (userEmail) {
      const userAttempts = await QuestionAttempt.find({ userEmail, questionId: id })
        .sort({ timestamp: 1 })
        .select('isCorrect timestamp')
        .lean();
      question.history = userAttempts;
    } else {
      question.history = [];
    }
    return NextResponse.json([question], { status: 200 });
  }

  const pageParam = searchParams.get('page');

  // 페이지네이션 파라미터가 없으면 수험자 모의고사 등 전체 조회 (유저별 독립 풀이 이력 매핑)
  if (!pageParam) {
    const questions = await Question.find({}).sort({ subject: 1, examType: 1, questionNumber: 1 }).lean();

    if (userEmail) {
      // 로그인 사용자의 문제 풀이 기록만 가져와서 question.history에 매핑
      const attempts = await QuestionAttempt.find({ userEmail })
        .sort({ timestamp: 1 })
        .select('questionId isCorrect timestamp')
        .lean();

      const userHistoryMap = new Map<string, { isCorrect: boolean; timestamp: Date }[]>();
      attempts.forEach((att) => {
        const qIdStr = att.questionId.toString();
        if (!userHistoryMap.has(qIdStr)) {
          userHistoryMap.set(qIdStr, []);
        }
        userHistoryMap.get(qIdStr)!.push({
          isCorrect: att.isCorrect,
          timestamp: att.timestamp,
        });
      });

      questions.forEach((q) => {
        q.history = userHistoryMap.get(q._id.toString()) || [];
      });
    } else {
      // 미로그인 게스트인 경우 다른 사람의 풀이 기록이 카운트되지 않도록 빈 배열 처리
      questions.forEach((q) => {
        q.history = [];
      });
    }

    return NextResponse.json(questions);
  }

  // 관리자용 서버 사이드 페이지네이션 및 필터링
  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10));
  const subject = searchParams.get('subject');
  const examType = searchParams.get('examType');
  const search = searchParams.get('search')?.trim();
  const sortBy = searchParams.get('sortBy') || 'default';

  const filter: Record<string, unknown> = {};

  if (subject && subject !== 'All') {
    filter.subject = subject;
  }
  if (examType && examType !== 'All') {
    filter.examType = examType;
  }
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
      { examType: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  // 정렬 조건에 따른 쿼리 분기
  let questionsPromise;
  if (sortBy === 'attempts-desc' || sortBy === 'attempts-asc') {
    const sortDir = sortBy === 'attempts-desc' ? -1 : 1;
    questionsPromise = Question.aggregate([
      { $match: filter },
      { $addFields: { historyCount: { $size: { $ifNull: ['$history', []] } } } },
      { $sort: { historyCount: sortDir, questionNumber: 1 } },
      { $skip: skip },
      { $limit: limit },
    ]);
  } else {
    questionsPromise = Question.find(filter)
      .sort({ subject: 1, examType: 1, questionNumber: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  const [total, questions, subjectsAgg, examTypesAgg, examTypes] = await Promise.all([
    Question.countDocuments(filter),
    questionsPromise,
    // 전체 과목별 통계 (전체 문항수, 활성화 문항수)
    Question.aggregate([
      {
        $group: {
          _id: '$subject',
          total: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [{ $ne: ['$isActive', false] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // 전체 회차별 통계 (전체 문항수, 활성화 문항수)
    Question.aggregate([
      {
        $group: {
          _id: '$examType',
          total: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [{ $ne: ['$isActive', false] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // 현재 선택된 과목 기준 회차 목록 (과목이 All이면 전체 회차)
    Question.distinct('examType', subject && subject !== 'All' ? { subject } : {}),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  const subjects = subjectsAgg
    .filter((s) => s._id)
    .map((s) => ({
      name: s._id as string,
      total: s.total as number,
      activeCount: s.activeCount as number,
      isActive: (s.activeCount as number) > 0,
      isAllActive: s.activeCount === s.total,
    }));

  const examTypeStats = examTypesAgg
    .filter((e) => e._id)
    .map((e) => ({
      name: e._id as string,
      total: e.total as number,
      activeCount: e.activeCount as number,
      isActive: (e.activeCount as number) > 0,
      isAllActive: e.activeCount === e.total,
    }));

  return NextResponse.json({
    questions,
    total,
    page,
    limit,
    totalPages,
    subjects,
    examTypes,
    examTypeStats,
  });
}

// 2. 새 문제 등록
async function handlePost(req: Request) {
  await dbConnect();
  const body = await req.json();
  const newQuestion = await Question.create(body);
  return NextResponse.json({ success: true, data: newQuestion }, { status: 201 });
}

// 3. 문제 삭제 또는 전체 풀이 기록 초기화 / 과목·회차 일괄 삭제
async function handleDelete(req: Request) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const resetAll = searchParams.get('resetAll');
  const deleteSubject = searchParams.get('deleteSubject');
  const deleteExamType = searchParams.get('deleteExamType');

  // 전체 풀이 기록 초기화 요청 처리
  if (resetAll === 'true') {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    const userEmail = session?.user?.email;

    if (userRole === 'admin') {
      await Question.updateMany({}, { $set: { history: [] } });
      await QuestionAttempt.deleteMany({});
      return NextResponse.json({ success: true, message: 'All histories reset' }, { status: 200 });
    } else if (userEmail) {
      // 일반 사용자는 본인의 풀이 기록만 초기화
      await QuestionAttempt.deleteMany({ userEmail });
      await Question.updateMany(
        { 'history.userEmail': userEmail },
        { $pull: { history: { userEmail } } }
      );
      return NextResponse.json({ success: true, message: 'My histories reset' }, { status: 200 });
    }
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // 과목 전체 일괄 삭제
  if (deleteSubject) {
    const result = await Question.deleteMany({ subject: deleteSubject });
    return NextResponse.json(
      {
        success: true,
        message: `'${deleteSubject}' 과목의 모든 문제(${result.deletedCount}개)가 성공적으로 삭제되었습니다.`,
        deletedCount: result.deletedCount,
      },
      { status: 200 }
    );
  }

  // 회차 전체 일괄 삭제
  if (deleteExamType) {
    const result = await Question.deleteMany({ examType: deleteExamType });
    return NextResponse.json(
      {
        success: true,
        message: `'${deleteExamType}' 회차의 모든 문제(${result.deletedCount}개)가 성공적으로 삭제되었습니다.`,
        deletedCount: result.deletedCount,
      },
      { status: 200 }
    );
  }

  if (!id) return NextResponse.json({ success: false, error: 'Question ID is required' }, { status: 400 });
  await Question.findByIdAndDelete(id);
  return NextResponse.json({ success: true }, { status: 200 });
}

// 4. 문제 정보 수정 또는 과목/회차 단위 일괄 활성화/비활성화 (단일 및 다중 지원)
async function handlePut(req: Request) {
  await dbConnect();
  const body = await req.json();

  // 4-1. 과목 단위 다중/단일 일괄 활성화/비활성화 처리
  if (body.targetSubjects && Array.isArray(body.targetSubjects) && typeof body.isActive === 'boolean') {
    const result = await Question.updateMany(
      { subject: { $in: body.targetSubjects } },
      { $set: { isActive: body.isActive } }
    );
    return NextResponse.json(
      { success: true, modifiedCount: result.modifiedCount },
      { status: 200 }
    );
  }

  if (body.targetSubject && typeof body.isActive === 'boolean') {
    const filter = body.targetSubject === 'All' ? {} : { subject: body.targetSubject };
    const result = await Question.updateMany(filter, { $set: { isActive: body.isActive } });
    return NextResponse.json(
      {
        success: true,
        message: `${body.targetSubject === 'All' ? '전체' : body.targetSubject} 과목의 상태가 ${
          body.isActive ? '활성화' : '비활성화'
        }되었습니다.`,
        modifiedCount: result.modifiedCount,
      },
      { status: 200 }
    );
  }

  // 4-2. 회차 단위 다중/단일 일괄 활성화/비활성화 처리
  if (body.targetExamTypes && Array.isArray(body.targetExamTypes) && typeof body.isActive === 'boolean') {
    const result = await Question.updateMany(
      { examType: { $in: body.targetExamTypes } },
      { $set: { isActive: body.isActive } }
    );
    return NextResponse.json(
      { success: true, modifiedCount: result.modifiedCount },
      { status: 200 }
    );
  }

  if (body.targetExamType && typeof body.isActive === 'boolean') {
    const filter = body.targetExamType === 'All' ? {} : { examType: body.targetExamType };
    const result = await Question.updateMany(filter, { $set: { isActive: body.isActive } });
    return NextResponse.json(
      {
        success: true,
        message: `${body.targetExamType === 'All' ? '전체' : body.targetExamType} 회차의 상태가 ${
          body.isActive ? '활성화' : '비활성화'
        }되었습니다.`,
        modifiedCount: result.modifiedCount,
      },
      { status: 200 }
    );
  }

  // 4-2. 단일 문제 수정 (개별 풀이 기록 초기화 처리 포함)
  const { _id, ...updateData } = body;
  if (!_id) return NextResponse.json({ success: false, error: 'Question ID is required' }, { status: 400 });

  if (Array.isArray(updateData.history) && updateData.history.length === 0) {
    await QuestionAttempt.deleteMany({ questionId: _id });
  }

  const updatedQuestion = await Question.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' });
  return NextResponse.json({ success: true, data: updatedQuestion }, { status: 200 });
}

// 5. 사용자 문제 풀이 기록(정답/오답) 추가
async function handlePatch(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  const body = await req.json();
  const { _id, isCorrect, userAnswer = "" } = body;
  
  if (!_id) return NextResponse.json({ success: false, error: 'Question ID is required' }, { status: 400 });

  const now = new Date();

  // 로그인 사용자의 경우 독립 QuestionAttempt 컬렉션 및 러닝 로그 연동
  if (userEmail) {
    const question = await Question.findById(_id).select("subject examType title").lean();
    if (question) {
      await QuestionAttempt.create({
        userEmail,
        questionId: _id,
        isCorrect: Boolean(isCorrect),
        userAnswer: String(userAnswer || ""),
        subject: question.subject || "",
        examType: question.examType || "",
        timestamp: now,
      });

      const todayStr = formatDate(now);
      await LearningLog.findOneAndUpdate(
        { userEmail, date: todayStr },
        {
          $inc: {
            questionsSolved: 1,
            ...(isCorrect ? { questionsCorrect: 1 } : {}),
          },
          $push: {
            recentActivities: {
              $each: [
                {
                  type: "question",
                  title: `기출 풀이 (${isCorrect ? "정답" : "오답"}): ${question.title?.slice(0, 30) || "문제"}`,
                  timestamp: now,
                },
              ],
              $slice: -20,
            },
          },
        },
        { returnDocument: "after", upsert: true }
      );
    }
  }

  const updatedQuestion = await Question.findByIdAndUpdate(
    _id,
    {
      $push: {
        history: {
          userEmail: userEmail || undefined,
          isCorrect: Boolean(isCorrect),
          timestamp: now,
        },
      },
    },
    { returnDocument: 'after' }
  );
  return NextResponse.json({ success: true, data: updatedQuestion }, { status: 200 });
}

// withAudit 래퍼를 적용하여 기출문제 관리 및 풀이 기록 관련 모든 활동이 감사 로그에 자동 수집됨
export const GET = withAudit(handleGet, '기출문제 DB 목록 조회');
export const POST = withAudit(handlePost, '새로운 기출문제 등록');
export const DELETE = withAudit(handleDelete, '기출문제 삭제 또는 전체 풀이 기록 초기화');
export const PUT = withAudit(handlePut, '기출문제 정보 수정');
export const PATCH = withAudit(handlePatch, '사용자 문제 풀이 결과 기록');
