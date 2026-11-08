import nodemailer from "nodemailer";

interface FeedbackEmailParams {
  type: string;
  title: string;
  content: string;
  userEmail: string;
  userName?: string;
  rating?: number;
}

const typeLabels: Record<string, string> = {
  bug: "🐛 버그 제보",
  feature: "💡 기능 제안",
  inquiry: "❓ 서비스 문의",
  feedback: "💬 일반 피드백",
};

/**
 * 🌟 관리자에게 새로운 피드백/문의 접수 알림 이메일 전송
 */
export async function sendFeedbackNotificationEmail(params: FeedbackEmailParams): Promise<boolean> {
  const { type, title, content, userEmail, userName, rating } = params;

  const adminEmail =
    process.env.ADMIN_EMAIL ||
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    "admin@one-quiz.com";

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  const typeName = typeLabels[type] || "💬 피드백";
  const stars = rating ? "★".repeat(rating) + "☆".repeat(5 - rating) : "";

  // SMTP 환경변수가 미설정된 경우 모의 발송 로그 처리 (오류 없이 안전 동작)
  if (!user || !pass) {
    console.log(
      `[Email Notification (Mock)] 관리자(${adminEmail})에게 피드백 알림: [${typeName}] ${title} from ${userEmail}`
    );
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const htmlContent = `
      <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 20px;">[원퀴즈] 새로운 ${typeName}가 접수되었습니다</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">보낸이: ${userName || "학습자"} (${userEmail})</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p style="font-size: 14px; font-weight: bold; color: #1e293b; margin: 0 0 6px 0;">제목: ${title}</p>
          ${rating ? `<p style="font-size: 13px; color: #f59e0b; margin: 0 0 12px 0;">만족도: ${stars} (${rating}점)</p>` : ""}
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${content}</div>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">원퀴즈 관리자 설정에서 실시간으로 답변 및 처리 상태를 변경할 수 있습니다.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"원퀴즈 알림" <${user}>`,
      to: adminEmail,
      subject: `[원퀴즈 ${typeName}] ${title}`,
      html: htmlContent,
    });

    return true;
  } catch (error) {
    console.error("Failed to send feedback email notification:", error);
    return false;
  }
}
