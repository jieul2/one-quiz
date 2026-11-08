import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SiteSetting from '@/models/SiteSetting';
import { withAudit } from '@/lib/withAudit';

async function handleGet() {
  await dbConnect();
  let setting = await SiteSetting.findOne({});
  if (!setting) {
    setting = await SiteSetting.create({
      siteTitle: '원퀴즈 (OneQuiz)',
      landingSubtitle: '혼자서 공부하는 수험생을 위한 올인원 스터디 플랫폼',
      studyGoalQuestions: 20,
      pomodoroDefaultMinutes: 25,
      examDefaultTimeLimit: 60,
      enableOnboardingGuide: true,
      enableNoticeBanner: false,
      noticeBannerText: '2026 자격증/기출문제 신규 모의고사가 업데이트되었습니다!',
      noticeBannerType: 'info',
      logRetentionDays: 90,
    });
  }
  return NextResponse.json(setting, { status: 200 });
}

async function handlePut(req: Request) {
  await dbConnect();
  const body = await req.json();
  const {
    siteTitle,
    landingSubtitle,
    studyGoalQuestions,
    pomodoroDefaultMinutes,
    examDefaultTimeLimit,
    enableOnboardingGuide,
    enableNoticeBanner,
    noticeBannerText,
    noticeBannerType,
    logRetentionDays,
  } = body;

  let setting = await SiteSetting.findOne({});
  if (!setting) {
    setting = new SiteSetting();
  }

  if (siteTitle !== undefined) setting.siteTitle = siteTitle;
  if (landingSubtitle !== undefined) setting.landingSubtitle = landingSubtitle;
  if (studyGoalQuestions !== undefined) setting.studyGoalQuestions = Number(studyGoalQuestions);
  if (pomodoroDefaultMinutes !== undefined) setting.pomodoroDefaultMinutes = Number(pomodoroDefaultMinutes);
  if (examDefaultTimeLimit !== undefined) setting.examDefaultTimeLimit = Number(examDefaultTimeLimit);
  if (enableOnboardingGuide !== undefined) setting.enableOnboardingGuide = Boolean(enableOnboardingGuide);
  if (enableNoticeBanner !== undefined) setting.enableNoticeBanner = Boolean(enableNoticeBanner);
  if (noticeBannerText !== undefined) setting.noticeBannerText = noticeBannerText;
  if (noticeBannerType !== undefined) setting.noticeBannerType = noticeBannerType;
  if (logRetentionDays !== undefined) setting.logRetentionDays = Number(logRetentionDays);

  setting.updatedAt = new Date();
  await setting.save();

  return NextResponse.json({ success: true, data: setting }, { status: 200 });
}

export const GET = withAudit(handleGet, '사이트 전역 설정 조회');
export const PUT = withAudit(handlePut, '사이트 전역 설정 개별 저장');
