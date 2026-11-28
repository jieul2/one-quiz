import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, User } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Idea, { IHistoryChange } from "@/models/Idea";
import Notification from "@/models/Notification";
import { withAudit } from "@/lib/withAudit";
import { getCollabAccess, getUserCollabGroups } from "@/lib/collaborationServer";

interface DocShape {
  id?: string;
  _id?: { toString(): string } | string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  authorEmail?: string;
  sharedWithEmails?: string[];
  tags?: string[];
  isPublic?: boolean;
  assignee?: string;
  promotedToProjectId?: string;
  startDate?: string;
  endDate?: string;
  color?: string;
  createdAt?: string | Date;
  completedAt?: string | Date;
}

function mapIdeaDoc(
  doc: DocShape,
  currentEmail: string,
  roleMap: Map<string, "owner" | "editor" | "viewer">
) {
  const ownerEmail = doc.authorEmail || currentEmail;
  const normalizedCurrent = currentEmail.toLowerCase();
  const sharedList = Array.isArray(doc.sharedWithEmails)
    ? doc.sharedWithEmails
    : [];
  const isCardRecipient =
    ownerEmail.toLowerCase() !== normalizedCurrent &&
    sharedList.some((e) => e.toLowerCase() === normalizedCurrent);

  const resolvedRole = isCardRecipient
    ? "editor"
    : roleMap.get(ownerEmail) ||
      (ownerEmail.toLowerCase() === normalizedCurrent ? "owner" : "viewer");

  return {
    ...doc,
    id: doc.id || doc._id?.toString() || `idea-${Date.now()}`,
    _id: doc._id?.toString(),
    title: doc.title,
    description: doc.description || "",
    status: doc.status || "idea",
    priority: doc.priority || "medium",
    authorEmail: ownerEmail,
    sharedWithEmails: sharedList,
    isShared:
      ownerEmail.toLowerCase() !== normalizedCurrent || sharedList.length > 0,
    isCardShared: isCardRecipient,
    collabRole: resolvedRole,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    isPublic: doc.isPublic !== undefined ? doc.isPublic : false,
    assignee: doc.assignee || "",
    promotedToProjectId: doc.promotedToProjectId || "",
    startDate: doc.startDate || "",
    endDate: doc.endDate || "",
    color: doc.color || "#0284c7",
    completedAt: doc.completedAt
      ? new Date(doc.completedAt).toISOString().slice(0, 10)
      : undefined,
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  };
}

// 1. 조회 (본인 소유 + 카드 이메일 직접 공유 + 협업 워크스페이스만 엄격 격리 조회)
async function handleGet(req: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const workspaceOwner = searchParams.get("workspaceOwner");
  const metaMode = searchParams.get("meta") === "true";
  const normalizedEmail = userEmail.toLowerCase();

  const groups = await getUserCollabGroups("backlog", userEmail);
  const roleMap = new Map<string, "owner" | "editor" | "viewer">();
  roleMap.set(userEmail, "owner");

  const workspaces: Array<{
    ownerEmail: string;
    ownerName: string;
    targetTitle: string;
    role: "owner" | "editor" | "viewer";
    isOwn: boolean;
    memberCount: number;
  }> = [
    {
      ownerEmail: userEmail,
      ownerName: session.user?.name || userEmail.split("@")[0],
      targetTitle: "내 기능 백로그",
      role: "owner",
      isOwn: true,
      memberCount:
        (groups.find((g) => g.ownerEmail === userEmail)?.members?.length || 0) +
        1,
    },
  ];

  for (const g of groups) {
    if (g.ownerEmail !== userEmail) {
      const m = g.members?.find((item) => item.email === userEmail);
      const role = m?.role || "viewer";
      roleMap.set(g.ownerEmail, role);
      workspaces.push({
        ownerEmail: g.ownerEmail,
        ownerName: g.ownerName,
        targetTitle: g.targetTitle || `${g.ownerName}님의 기능 백로그`,
        role,
        isOwn: false,
        memberCount: (g.members?.length || 0) + 1,
      });
    }
  }

  let queryFilter: Record<string, unknown>;

  if (workspaceOwner && workspaceOwner !== userEmail) {
    if (!roleMap.has(workspaceOwner)) {
      return NextResponse.json(
        { error: "해당 백로그 워크스페이스에 접근할 권한이 없습니다." },
        { status: 403 }
      );
    }
    queryFilter = { authorEmail: workspaceOwner };
  } else if (workspaceOwner === userEmail) {
    // 내 워크스페이스 조회 시: 내가 작성한 카드 + 개별 카드에 내 이메일이 직접 공유된 카드 모두 포함
    queryFilter = {
      $or: [
        { authorEmail: userEmail },
        { sharedWithEmails: { $in: [userEmail, normalizedEmail] } },
      ],
    };
  } else {
    const allowedOwners = Array.from(roleMap.keys());
    queryFilter = {
      $or: [
        { authorEmail: { $in: allowedOwners } },
        { sharedWithEmails: { $in: [userEmail, normalizedEmail] } },
      ],
    };
  }

  const ideas = await Idea.find(queryFilter).sort({ createdAt: -1 }).lean();
  const mapped = ideas.map((doc: DocShape) =>
    mapIdeaDoc(doc, userEmail, roleMap)
  );

  if (metaMode) {
    const activeOwner = workspaceOwner || userEmail;
    return NextResponse.json(
      {
        items: mapped,
        workspaces,
        activeWorkspaceOwner: activeOwner,
        myRole: roleMap.get(activeOwner) || "owner",
      },
      { status: 200 }
    );
  }

  return NextResponse.json(mapped, { status: 200 });
}

// 2. 생성 및 일괄 배치 동기화 (소유자 + 카드 공유 대상 + 협업 워크스페이스 허용)
async function handlePost(req: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const workspaceOwner = searchParams.get("workspaceOwner") || userEmail;
  const normalizedEmail = userEmail.toLowerCase();

  if (workspaceOwner !== userEmail) {
    const access = await getCollabAccess(
      "backlog",
      workspaceOwner,
      userEmail,
      workspaceOwner
    );
    if (!access.canEdit) {
      return NextResponse.json(
        { error: "공유 백로그 편집 권한이 없습니다." },
        { status: 403 }
      );
    }
  }

  const body = await req.json();

  if (Array.isArray(body)) {
    if (body.length === 0) {
      return NextResponse.json({ success: true, count: 0 }, { status: 200 });
    }

    const now = new Date();
    const operations = body.map((item) => {
      const itemId =
        item.id ||
        (item._id
          ? String(item._id)
          : `idea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
      const isObjectId = item._id && String(item._id).length === 24;
      const itemOwner = item.authorEmail || workspaceOwner;
      const accessFilter =
        workspaceOwner !== userEmail
          ? { authorEmail: workspaceOwner }
          : {
              $or: [
                { authorEmail: userEmail },
                { sharedWithEmails: { $in: [userEmail, normalizedEmail] } },
              ],
            };

      const filter = isObjectId
        ? { _id: item._id, ...accessFilter }
        : { id: itemId, ...accessFilter };

      const updateFields: Record<string, unknown> = {
        id: itemId,
        title: item.title,
        description: item.description || "",
        status: item.status || "idea",
        priority: item.priority || "medium",
        tags: Array.isArray(item.tags) ? item.tags : [],
        isPublic: item.isPublic !== undefined ? item.isPublic : false,
        assignee: item.assignee,
        promotedToProjectId: item.promotedToProjectId,
        startDate: item.startDate,
        endDate: item.endDate,
        color: item.color || "#0284c7",
        completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
        updatedAt: now,
      };

      const setOnInsertFields: Record<string, unknown> = {
        authorEmail: itemOwner,
        createdAt: now,
        historyLogs: [
          { message: "✨ 최초 아이디어 생성", changes: [], updatedAt: now },
        ],
      };

      // 소유자 본인만 sharedWithEmails 배열 변경 가능 ($set과 $setOnInsert 경로 충돌 방지)
      if (
        itemOwner === userEmail &&
        Array.isArray(item.sharedWithEmails)
      ) {
        updateFields.sharedWithEmails = item.sharedWithEmails
          .map((e: string) => String(e).trim().toLowerCase())
          .filter(Boolean);
      } else {
        setOnInsertFields.sharedWithEmails = [];
      }

      return {
        updateOne: {
          filter,
          update: {
            $set: updateFields,
            $setOnInsert: setOnInsertFields,
          },
          upsert: itemOwner === userEmail,
        },
      };
    });

    await Idea.bulkWrite(operations);
    return NextResponse.json(
      { success: true, count: operations.length },
      { status: 201 }
    );
  }

  // 단일 아이템 생성
  const newDocData = {
    ...body,
    id: body.id || `idea-${Date.now()}`,
    authorEmail: workspaceOwner,
    sharedWithEmails: Array.isArray(body.sharedWithEmails)
      ? body.sharedWithEmails
          .map((e: string) => String(e).trim().toLowerCase())
          .filter(Boolean)
      : [],
    isPublic: body.isPublic !== undefined ? body.isPublic : false,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: body.status === "completed" ? new Date() : null,
    historyLogs: [
      { message: "✨ 최초 아이디어 생성", changes: [], updatedAt: new Date() },
    ],
  };

  const newIdea = await Idea.create(newDocData);
  return NextResponse.json({ success: true, data: newIdea }, { status: 201 });
}

// 3. 수정 및 커밋 히스토리 기록
async function handlePut(req: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  await dbConnect();
  const body = await req.json();
  const targetId = body._id || body.id;

  if (!targetId) {
    return NextResponse.json(
      { success: false, error: "ID is required" },
      { status: 400 }
    );
  }

  let existing = null;
  if (String(targetId).length === 24) {
    existing = await Idea.findById(targetId);
  }
  if (!existing) {
    existing = await Idea.findOne({ id: targetId });
  }

  const normalizedEmail = userEmail.toLowerCase();
  if (existing && existing.authorEmail && existing.authorEmail !== userEmail) {
    const isCardShared = existing.sharedWithEmails?.some(
      (e: string) => e.toLowerCase() === normalizedEmail
    );
    if (!isCardShared) {
      const access = await getCollabAccess(
        "backlog",
        existing.authorEmail,
        userEmail,
        existing.authorEmail
      );
      if (!access.canEdit) {
        return NextResponse.json(
          { success: false, error: "수정 권한이 없습니다." },
          { status: 403 }
        );
      }
    }
  }

  const {
    status,
    priority,
    title,
    description,
    commitMessage,
    tags,
    isPublic,
    assignee,
    promotedToProjectId,
    startDate,
    endDate,
    color,
  } = body;

  const changes: IHistoryChange[] = [];
  if (existing) {
    if (existing.title !== title) {
      changes.push({
        field: "제목 (Title)",
        oldValue: existing.title,
        newValue: title,
      });
    }
    if (existing.description !== description) {
      changes.push({
        field: "설명 (Description)",
        oldValue: existing.description || "(없음)",
        newValue: description || "(없음)",
      });
    }
    if (existing.status !== status) {
      changes.push({
        field: "상태 (Status)",
        oldValue: existing.status,
        newValue: status,
      });
    }
    if (existing.priority !== priority) {
      changes.push({
        field: "우선순위 (Priority)",
        oldValue: existing.priority,
        newValue: priority,
      });
    }
  }

  const updateData: Record<string, unknown> = {
    title,
    description,
    status: status || existing?.status || "idea",
    priority: priority || existing?.priority || "medium",
    tags: Array.isArray(tags) ? tags : existing?.tags || [],
    isPublic: isPublic !== undefined ? isPublic : existing?.isPublic ?? false,
    assignee: assignee !== undefined ? assignee : existing?.assignee,
    promotedToProjectId:
      promotedToProjectId !== undefined
        ? promotedToProjectId
        : existing?.promotedToProjectId,
    startDate: startDate !== undefined ? startDate : existing?.startDate,
    endDate: endDate !== undefined ? endDate : existing?.endDate,
    color: color !== undefined ? color : existing?.color,
    updatedAt: new Date(),
  };

  if (status === "completed" && existing?.status !== "completed") {
    updateData.completedAt = new Date();
  } else if (status && status !== "completed") {
    updateData.completedAt = null;
  }

  const logMsg =
    commitMessage && commitMessage.trim() !== ""
      ? commitMessage
      : changes.length > 0
      ? changes.map((c) => c.field).join(", ") + " 수정"
      : "📝 문서 업데이트";

  let updated = null;
  if (existing) {
    updated = await Idea.findByIdAndUpdate(
      existing._id,
      {
        ...updateData,
        $push: {
          historyLogs: { message: logMsg, changes, updatedAt: new Date() },
        },
      },
      { returnDocument: "after" }
    );
  } else {
    updated = await Idea.create({
      ...updateData,
      id: targetId,
      authorEmail: userEmail,
      createdAt: new Date(),
      historyLogs: [
        { message: "✨ 최초 생성", changes: [], updatedAt: new Date() },
      ],
    });
  }

  return NextResponse.json({ success: true, data: updated }, { status: 200 });
}

// 4. PATCH: 백로그 카드 단위 즉시 이메일 공유 추가/해제 (수락·거절 불필요)
async function handlePatch(req: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  await dbConnect();
  const body = await req.json();
  const { id, fallbackId, action, email, cardData } = body as {
    id?: string;
    fallbackId?: string;
    action?: "addEmail" | "removeEmail";
    email?: string;
    cardData?: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      tags?: string[];
      assignee?: string;
      startDate?: string;
      endDate?: string;
      color?: string;
    };
  };

  if (!id || !action || !email) {
    return NextResponse.json(
      { error: "카드 ID, 작업 유형, 대상 이메일이 필요합니다." },
      { status: 400 }
    );
  }

  const normalizedTarget = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedTarget)) {
    return NextResponse.json(
      { error: "올바른 이메일 형식을 입력해주세요." },
      { status: 400 }
    );
  }

  if (normalizedTarget === userEmail.toLowerCase()) {
    return NextResponse.json(
      { error: "본인 이메일은 추가할 수 없습니다." },
      { status: 400 }
    );
  }

  const candidateIds = Array.from(
    new Set([String(id), ...(fallbackId ? [String(fallbackId)] : [])])
  );
  const objectIds = candidateIds.filter((v) => v.length === 24);

  let existing = await Idea.findOne({
    $or: [
      { id: { $in: candidateIds } },
      ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
    ],
  });

  // 아직 DB에 반영되기 직전(로컬 캐시/생성 직후)인 경우 카드 데이터를 함께 저장 후 즉시 공유
  if (!existing && action === "addEmail" && cardData?.title) {
    existing = await Idea.create({
      id: fallbackId || String(id),
      title: cardData.title,
      description: cardData.description || "",
      status: cardData.status || "idea",
      priority: cardData.priority || "medium",
      tags: Array.isArray(cardData.tags) ? cardData.tags : [],
      assignee: cardData.assignee || "",
      startDate: cardData.startDate || "",
      endDate: cardData.endDate || "",
      color: cardData.color || "#0284c7",
      authorEmail: userEmail,
      sharedWithEmails: [],
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      historyLogs: [
        { message: "✨ 최초 아이디어 생성", changes: [], updatedAt: new Date() },
      ],
    });
  }

  if (!existing) {
    return NextResponse.json(
      { error: "해당 백로그 카드를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (existing.authorEmail && existing.authorEmail !== userEmail) {
    return NextResponse.json(
      { error: "카드 작성자만 공유 이메일을 관리할 수 있습니다." },
      { status: 403 }
    );
  }

  let updated;
  if (action === "addEmail") {
    updated = await Idea.findByIdAndUpdate(
      existing._id,
      { $addToSet: { sharedWithEmails: normalizedTarget } },
      { returnDocument: "after" }
    );

    // 가입된 회원인 경우 알림 위젯에도 즉시 공유 안내 기록 (수락/거절 절차 없음)
    const targetUser = await User.findOne({ email: normalizedTarget })
      .select("email")
      .lean();
    if (targetUser) {
      const senderName =
        session.user?.name || userEmail.split("@")[0] || "회원";
      await Notification.create({
        recipientEmail: normalizedTarget,
        senderEmail: userEmail,
        senderName,
        type: "system",
        moduleType: "backlog",
        targetId: userEmail,
        targetTitle: existing.title,
        title: `${senderName}님이 백로그 카드를 공유했습니다`,
        message: `[${existing.title}] 카드에 이메일이 등록되어 즉시 열람할 수 있습니다.`,
        actionStatus: "none",
        isRead: false,
      });
    }
  } else if (action === "removeEmail") {
    updated = await Idea.findByIdAndUpdate(
      existing._id,
      { $pull: { sharedWithEmails: normalizedTarget } },
      { returnDocument: "after" }
    );
  } else {
    return NextResponse.json(
      { error: "지원하지 않는 작업입니다." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    sharedWithEmails: updated?.sharedWithEmails || [],
  });
}

// 5. 삭제 (카드 소유자 또는 editor 권한 확인)
async function handleDelete(req: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { success: false, error: "ID is required" },
      { status: 400 }
    );
  }

  const existing =
    id.length === 24 ? await Idea.findById(id) : await Idea.findOne({ id });

  if (!existing) {
    return NextResponse.json(
      { success: false, error: "삭제할 항목을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (existing.authorEmail && existing.authorEmail !== userEmail) {
    const access = await getCollabAccess(
      "backlog",
      existing.authorEmail,
      userEmail,
      existing.authorEmail
    );
    if (!access.canEdit) {
      return NextResponse.json(
        { success: false, error: "삭제 권한이 없습니다." },
        { status: 403 }
      );
    }
  }

  await Idea.findByIdAndDelete(existing._id);
  return NextResponse.json({ success: true }, { status: 200 });
}

export const GET = withAudit(handleGet, "프로젝트 로드맵 아이디어 조회");
export const POST = withAudit(handlePost, "새로운 기능 아이디어 등록");
export const PUT = withAudit(handlePut, "기능 아이디어 수정 및 커밋");
export const PATCH = withAudit(handlePatch, "백로그 카드 이메일 즉시 공유 관리");
export const DELETE = withAudit(handleDelete, "기능 아이디어 삭제");
