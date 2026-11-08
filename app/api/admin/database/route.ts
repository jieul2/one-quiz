import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { withAudit } from "@/lib/withAudit";
import mongoose from "mongoose";

// GET: 컬렉션 목록 또는 특정 컬렉션의 문서 목록/단건 조회
async function handleGet(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "데이터베이스 연결에 실패했습니다." }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // 1. 전체 컬렉션 목록 및 문서 수 조회
    if (action === "collections") {
      const collections = await db.listCollections().toArray();
      const validCollections = collections.filter((c) => !c.name.startsWith("system."));

      const stats = await Promise.all(
        validCollections.map(async (c) => {
          try {
            const count = await db.collection(c.name).countDocuments();
            return {
              name: c.name,
              count,
              type: c.type || "collection",
            };
          } catch {
            return {
              name: c.name,
              count: 0,
              type: c.type || "collection",
            };
          }
        })
      );

      // 이름순 정렬
      stats.sort((a, b) => a.name.localeCompare(b.name));

      return NextResponse.json({ collections: stats }, { status: 200 });
    }

    // 2. 특정 컬렉션의 문서 조회
    const collectionName = searchParams.get("collection");
    if (!collectionName || !/^[a-zA-Z0-9_\-\.]+$/.test(collectionName)) {
      return NextResponse.json({ error: "유효하지 않은 컬렉션 이름입니다." }, { status: 400 });
    }

    const docId = searchParams.get("id");

    // 2-1. 단건 상세 조회
    if (docId) {
      let query: Record<string, unknown>;
      if (mongoose.Types.ObjectId.isValid(docId)) {
        query = { $or: [{ _id: new mongoose.Types.ObjectId(docId) }, { _id: docId }] };
      } else {
        query = { _id: docId };
      }

      const document = await db.collection(collectionName).findOne(query);
      if (!document) {
        return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json({ document }, { status: 200 });
    }

    // 2-2. 페이지네이션 및 검색 쿼리
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search")?.trim() || "";

    let query: Record<string, unknown> = {};
    if (search) {
      if (mongoose.Types.ObjectId.isValid(search)) {
        query = { $or: [{ _id: new mongoose.Types.ObjectId(search) }, { _id: search }] };
      } else {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        query = {
          $or: [
            { title: regex },
            { name: regex },
            { email: regex },
            { userEmail: regex },
            { authorEmail: regex },
            { subject: regex },
            { examType: regex },
            { content: regex },
            { message: regex },
            { text: regex },
            { slug: regex },
            { code: regex },
          ],
        };
      }
    }

    const total = await db.collection(collectionName).countDocuments(query);
    const skip = (page - 1) * limit;

    const documents = await db
      .collection(collectionName)
      .find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // 표 렌더링을 위해 수집된 문서들의 상위 필드 키 목록 추출
    const fieldSet = new Set<string>();
    documents.forEach((doc) => {
      Object.keys(doc).forEach((k) => fieldSet.add(k));
    });
    const fields = Array.from(fieldSet);

    return NextResponse.json(
      {
        collection: collectionName,
        documents,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        fields,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to query database:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "데이터베이스 조회 실패" },
      { status: 500 }
    );
  }
}

// POST: 신규 문서 생성
async function handlePost(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "데이터베이스 연결에 실패했습니다." }, { status: 500 });
    }

    const body = await request.json();
    const { collection: collectionName, document } = body;

    if (!collectionName || !document || typeof document !== "object") {
      return NextResponse.json({ error: "컬렉션 및 유효한 문서 데이터가 필요합니다." }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(collectionName)) {
      return NextResponse.json({ error: "유효하지 않은 컬렉션 이름입니다." }, { status: 400 });
    }

    const docToInsert = { ...document };

    // _id 비어있거나 자동 생성 필요한 경우 제거
    if (!docToInsert._id) {
      delete docToInsert._id;
    } else if (typeof docToInsert._id === "string" && mongoose.Types.ObjectId.isValid(docToInsert._id)) {
      docToInsert._id = new mongoose.Types.ObjectId(docToInsert._id);
    }

    // 기본 생성 일시 설정
    if (!docToInsert.createdAt && !docToInsert.timestamp) {
      docToInsert.createdAt = new Date();
    }

    const result = await db.collection(collectionName).insertOne(docToInsert);

    return NextResponse.json(
      {
        success: true,
        message: "문서가 성공적으로 생성되었습니다.",
        insertedId: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to insert document:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "문서 생성 실패" },
      { status: 500 }
    );
  }
}

// PUT: 기존 문서 수정
async function handlePut(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "데이터베이스 연결에 실패했습니다." }, { status: 500 });
    }

    const body = await request.json();
    const { collection: collectionName, id, document } = body;

    if (!collectionName || !id || !document || typeof document !== "object") {
      return NextResponse.json({ error: "컬렉션, ID, 및 유효한 문서 데이터가 필요합니다." }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(collectionName)) {
      return NextResponse.json({ error: "유효하지 않은 컬렉션 이름입니다." }, { status: 400 });
    }

    const updateData = { ...document };
    // MongoDB _id 불변 제약 준수
    delete updateData._id;

    if (!updateData.updatedAt) {
      updateData.updatedAt = new Date();
    }

    let targetQuery: Record<string, unknown>;
    if (mongoose.Types.ObjectId.isValid(id)) {
      targetQuery = { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { _id: id }] };
    } else {
      targetQuery = { _id: id };
    }

    const result = await db.collection(collectionName).updateOne(targetQuery, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "수정 대상 문서를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "문서가 성공적으로 수정되었습니다.",
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update document:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "문서 수정 실패" },
      { status: 500 }
    );
  }
}

// DELETE: 문서 삭제
async function handleDelete(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "데이터베이스 연결에 실패했습니다." }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    let collectionName = searchParams.get("collection");
    let id = searchParams.get("id");

    if (!collectionName || !id) {
      try {
        const body = await request.json();
        collectionName = collectionName || body.collection;
        id = id || body.id;
      } catch {}
    }

    if (!collectionName || !id) {
      return NextResponse.json({ error: "컬렉션 및 삭제할 ID가 필요합니다." }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(collectionName)) {
      return NextResponse.json({ error: "유효하지 않은 컬렉션 이름입니다." }, { status: 400 });
    }

    let targetQuery: Record<string, unknown>;
    if (mongoose.Types.ObjectId.isValid(id)) {
      targetQuery = { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { _id: id }] };
    } else {
      targetQuery = { _id: id };
    }

    const result = await db.collection(collectionName).deleteOne(targetQuery);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "삭제 대상 문서를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "문서가 성공적으로 삭제되었습니다." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "문서 삭제 실패" },
      { status: 500 }
    );
  }
}

export const GET = withAudit(handleGet, "데이터베이스 스키마 및 문서 조회");
export const POST = withAudit(handlePost, "데이터베이스 문서 신규 생성");
export const PUT = withAudit(handlePut, "데이터베이스 문서 수정");
export const DELETE = withAudit(handleDelete, "데이터베이스 문서 삭제");
