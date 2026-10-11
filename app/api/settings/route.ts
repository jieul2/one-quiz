import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SiteSetting from '@/models/SiteSetting';
import { withAudit } from '@/lib/withAudit';

async function handleGet() {
  await dbConnect();
  let setting = await SiteSetting.findOne({});
  if (!setting) {
    setting = await SiteSetting.create({
      siteTitle: 'oneQuiz',
      landingSubtitle: '중간고사 : 10/12 ~ 16, 드론조종사 : 10/21',
      isMaintenanceMode: false,
      maintenanceMessage: '시스템 서버 안정화 작업',
      maintenanceUpdatedAt: null,
      disabledFeatures: { exam: false, diary: false, ideas: false, admin: false },
    });
  }
  return NextResponse.json(setting, { status: 200 });
}

async function handlePut(req: Request) {
  await dbConnect();
  const body = await req.json();
  const { siteTitle, landingSubtitle, isMaintenanceMode, maintenanceMessage, disabledFeatures } = body;

  let setting = await SiteSetting.findOne({});
  if (!setting) {
    setting = new SiteSetting();
  }

  if (siteTitle !== undefined) setting.siteTitle = siteTitle;
  if (landingSubtitle !== undefined) setting.landingSubtitle = landingSubtitle;
  
  if (isMaintenanceMode !== undefined) {
    setting.isMaintenanceMode = isMaintenanceMode;
    // 점검 모드가 켜지는 순간 현재 시간을 점검 시간으로 자동 기록
    if (isMaintenanceMode) {
      setting.maintenanceUpdatedAt = new Date();
    }
  }

  if (maintenanceMessage !== undefined) setting.maintenanceMessage = maintenanceMessage;
  
  if (disabledFeatures !== undefined) {
    // TypeScript 경고(nullish coalescing 불필요)를 해결한 안전한 불리언 할당
    setting.disabledFeatures = {
      exam: Boolean(disabledFeatures.exam),
      diary: Boolean(disabledFeatures.diary),
      ideas: Boolean(disabledFeatures.ideas),
      admin: Boolean(disabledFeatures.admin),
    };
    setting.markModified('disabledFeatures');
  }

  setting.updatedAt = new Date();
  await setting.save();

  return NextResponse.json({ success: true, data: setting }, { status: 200 });
}

export const GET = withAudit(handleGet, '사이트 전역 설정 조회');
export const PUT = withAudit(handlePut, '사이트 전역 설정 개별 저장');