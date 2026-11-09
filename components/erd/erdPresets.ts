import { ErdTable, ErdRelation, FunctionalSpecItem, ApiSpecItem } from "@/models/ProjectSpec";

/**
 * 🌟 범용 스타터 샘플 템플릿 (User, Post, Comment 3개 기본 테이블)
 * ※ 주의: 원퀴즈 자체의 내부 DB 스키마는 보안 정책에 따라 하드코딩되지 않으며,
 * 사용자가 생성하는 독립적인 커스텀 프로젝트의 입문용 샘플 구조입니다.
 */
export const SAMPLE_STARTER_TABLES: ErdTable[] = [
  {
    id: "tbl_user",
    name: "User",
    comment: "사용자 계정 및 프로필",
    color: "primary",
    x: 40,
    y: 60,
    fields: [
      { id: "u1", name: "id", type: "ObjectId", isPrimaryKey: true, isNullable: false, comment: "고유 ID" },
      { id: "u2", name: "email", type: "String", isUnique: true, isNullable: false, comment: "이메일 계정" },
      { id: "u3", name: "username", type: "String", isNullable: false, comment: "닉네임" },
      { id: "u4", name: "role", type: "String", defaultValue: "'user'", comment: "권한 (user, admin)" },
      { id: "u5", name: "createdAt", type: "Date", comment: "가입 일시" },
    ],
  },
  {
    id: "tbl_post",
    name: "Post",
    comment: "게시글 및 콘텐츠 데이터",
    color: "blue",
    x: 420,
    y: 60,
    fields: [
      { id: "p1", name: "id", type: "ObjectId", isPrimaryKey: true, isNullable: false, comment: "게시글 고유 ID" },
      { id: "p2", name: "authorId", type: "ObjectId", isForeignKey: true, isNullable: false, comment: "작성자 User 참조 ID" },
      { id: "p3", name: "title", type: "String", isNullable: false, comment: "제목" },
      { id: "p4", name: "content", type: "String", isNullable: false, comment: "본문 마크다운" },
      { id: "p5", name: "viewCount", type: "Number", defaultValue: "0", comment: "조회수" },
      { id: "p6", name: "createdAt", type: "Date", comment: "작성일시" },
    ],
  },
  {
    id: "tbl_comment",
    name: "Comment",
    comment: "게시글 댓글 데이터",
    color: "emerald",
    x: 800,
    y: 60,
    fields: [
      { id: "c1", name: "id", type: "ObjectId", isPrimaryKey: true, isNullable: false, comment: "댓글 고유 ID" },
      { id: "c2", name: "postId", type: "ObjectId", isForeignKey: true, isNullable: false, comment: "참조 Post ID" },
      { id: "c3", name: "authorId", type: "ObjectId", isForeignKey: true, isNullable: false, comment: "작성자 User ID" },
      { id: "c4", name: "content", type: "String", isNullable: false, comment: "댓글 내용" },
      { id: "c5", name: "createdAt", type: "Date", comment: "작성일시" },
    ],
  },
];

export const SAMPLE_STARTER_RELATIONS: ErdRelation[] = [
  {
    id: "rel_user_post",
    fromTable: "tbl_user",
    fromField: "u1",
    toTable: "tbl_post",
    toField: "p2",
    type: "1:N",
    comment: "한 명의 사용자는 여러 개의 게시글을 작성할 수 있습니다.",
  },
  {
    id: "rel_post_comment",
    fromTable: "tbl_post",
    fromField: "p1",
    toTable: "tbl_comment",
    toField: "c2",
    type: "1:N",
    comment: "하나의 게시글에 여러 댓글이 달릴 수 있습니다.",
  },
];

export const SAMPLE_ARCHITECTURE_MD = `# 시스템 아키텍처 및 설계 명세서

## 1. 프로젝트 개요
- **목적**: 팀 또는 개인 프로젝트의 데이터베이스 설계 및 API 형상 관리
- **아키텍처**: 클라이언트-서버 기반 반응형 웹 애플리케이션
- **스택**: Next.js App Router, TypeScript, MongoDB / PostgreSQL

## 2. 보안 및 인증 흐름
- JWT 세션 또는 OAuth 2.0 기반 유저 인증
- 데이터베이스 접근 제어 및 사용자별 독립 스코프 격리

## 3. 데이터베이스 ERD 설계 원칙
- 모든 테이블은 식별 가능한 기본키(Primary Key)를 보유
- 외래키 참조 무결성을 보장하며, 복합 연관 관계는 명시적으로 N:M 매핑
`;

export const SAMPLE_FUNCTIONAL_SPECS: FunctionalSpecItem[] = [
  {
    id: "fn_auth",
    module: "인증 모듈",
    title: "소셜 로그인 및 사용자 프로필 관리",
    description: "OAuth 2.0 기반 간편 로그인 및 세션 기반 사용자 인가 처리",
    priority: "high",
    status: "done",
    assignee: "팀원 1",
  },
  {
    id: "fn_post",
    module: "게시판 모듈",
    title: "게시글 작성, 수정, 삭제 및 태그 필터링",
    description: "마크다운 에디터 기반 게시글 관리 및 실시간 조회수 집계",
    priority: "high",
    status: "in_progress",
    assignee: "팀원 2",
  },
];

export const SAMPLE_API_SPECS: ApiSpecItem[] = [
  {
    id: "api_users_me",
    method: "GET",
    endpoint: "/api/users/me",
    description: "현재 로그인된 사용자의 프로필 조회",
    authRequired: "user",
    responseStatus: "200 OK",
  },
  {
    id: "api_posts",
    method: "POST",
    endpoint: "/api/posts",
    description: "새로운 게시글 등록",
    requestParams: "{ title: string, content: string, tags?: string[] }",
    authRequired: "user",
    responseStatus: "201 Created",
  },
];

// 완전히 비어있는 백지 템플릿
export const BLANK_TABLES: ErdTable[] = [];
export const BLANK_RELATIONS: ErdRelation[] = [];
export const BLANK_ARCHITECTURE_MD = `# 프로젝트 아키텍처 명세서\n\n이곳에 시스템 아키텍처, 인프라 구성, 데이터 흐름도를 자유롭게 작성하세요.`;
export const BLANK_FUNCTIONAL_SPECS: FunctionalSpecItem[] = [];
export const BLANK_API_SPECS: ApiSpecItem[] = [];

// ========================================================
// 내보내기 유틸리티 함수들 (Mermaid, SQL, TypeScript)
// ========================================================

// Mermaid erDiagram 생성기
export function generateMermaidErd(tables: ErdTable[], relations: ErdRelation[]): string {
  if (tables.length === 0) return "erDiagram\n";

  const lines: string[] = ["erDiagram"];

  // 테이블 및 필드 정의
  tables.forEach((t) => {
    const tableName = t.name.replace(/\s+/g, "_");
    lines.push(`    ${tableName} {`);
    t.fields.forEach((f) => {
      const typeStr = f.type.replace(/[^a-zA-Z0-9]/g, "");
      const fieldName = f.name.replace(/[^a-zA-Z0-9_]/g, "");
      let constraint = "";
      if (f.isPrimaryKey) constraint = "PK";
      else if (f.isForeignKey) constraint = "FK";

      const commentStr = f.comment ? `"${f.comment.replace(/"/g, "'")}"` : "";
      lines.push(`        ${typeStr} ${fieldName} ${constraint} ${commentStr}`);
    });
    lines.push(`    }`);
  });

  // 관계 정의
  relations.forEach((r) => {
    const fromT = tables.find((t) => t.id === r.fromTable || t.name === r.fromTable);
    const toT = tables.find((t) => t.id === r.toTable || t.name === r.toTable);
    if (!fromT || !toT) return;

    let relSymbol = "||--o{"; // default 1:N
    if (r.type === "1:1") relSymbol = "||--||";
    if (r.type === "N:M") relSymbol = "}o--o{";

    const label = r.comment ? `"${r.comment.replace(/"/g, "'")}"` : `"${r.fromField}_to_${r.toField}"`;
    lines.push(`    ${fromT.name.replace(/\s+/g, "_")} ${relSymbol} ${toT.name.replace(/\s+/g, "_")} : ${label}`);
  });

  return lines.join("\n");
}

// SQL DDL (PostgreSQL / ANSI 표준) 생성기
export function generateSqlDdl(tables: ErdTable[], relations: ErdRelation[]): string {
  const statements: string[] = [
    `-- ========================================================`,
    `-- Database Schema DDL Export`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- ========================================================\n`,
  ];

  tables.forEach((t) => {
    statements.push(`CREATE TABLE IF NOT EXISTS "${t.name.toLowerCase()}" (`);
    const colDefs: string[] = [];
    const pks: string[] = [];

    t.fields.forEach((f) => {
      let sqlType = "VARCHAR(255)";
      const lowerType = f.type.toLowerCase();
      if (lowerType === "objectid" || lowerType === "uuid") sqlType = "VARCHAR(36)";
      else if (lowerType === "number" || lowerType === "int") sqlType = "INTEGER";
      else if (lowerType === "boolean") sqlType = "BOOLEAN";
      else if (lowerType === "date") sqlType = "TIMESTAMP WITH TIME ZONE";
      else if (lowerType === "array" || lowerType === "json") sqlType = "JSONB";

      let def = `  "${f.name}" ${sqlType}`;
      if (f.isPrimaryKey) pks.push(`"${f.name}"`);
      if (f.isUnique) def += " UNIQUE";
      if (!f.isNullable && !f.isPrimaryKey) def += " NOT NULL";
      if (f.defaultValue) def += ` DEFAULT ${f.defaultValue}`;
      colDefs.push(def);
    });

    if (pks.length > 0) {
      colDefs.push(`  PRIMARY KEY (${pks.join(", ")})`);
    }

    statements.push(colDefs.join(",\n"));
    statements.push(`);\n`);
  });

  // 외래키 제약조건
  if (relations.length > 0) {
    statements.push(`-- ================= Foreign Key Constraints =================`);
    relations.forEach((r, idx) => {
      const fromT = tables.find((t) => t.id === r.fromTable || t.name === r.fromTable);
      const toT = tables.find((t) => t.id === r.toTable || t.name === r.toTable);
      if (!fromT || !toT) return;

      const fromF = fromT.fields.find((f) => f.id === r.fromField || f.name === r.fromField);
      const toF = toT.fields.find((f) => f.id === r.toField || f.name === r.toField);
      if (!fromF || !toF) return;

      statements.push(
        `ALTER TABLE "${toT.name.toLowerCase()}" ADD CONSTRAINT "fk_${toT.name.toLowerCase()}_${idx}" ` +
          `FOREIGN KEY ("${toF.name}") REFERENCES "${fromT.name.toLowerCase()}" ("${fromF.name}") ON DELETE CASCADE;`
      );
    });
  }

  return statements.join("\n");
}

// TypeScript Interfaces 생성기
export function generateTypeScriptTypes(tables: ErdTable[]): string {
  const lines: string[] = [
    `// ========================================================`,
    `// TypeScript Interface Definitions`,
    `// ========================================================\n`,
  ];

  tables.forEach((t) => {
    if (t.comment) {
      lines.push(`/** ${t.comment} */`);
    }
    lines.push(`export interface I${t.name} {`);
    t.fields.forEach((f) => {
      let tsType = "string";
      const lower = f.type.toLowerCase();
      if (lower === "number" || lower === "int") tsType = "number";
      else if (lower === "boolean") tsType = "boolean";
      else if (lower === "date") tsType = "Date | string";
      else if (lower === "array") tsType = "any[]";
      else if (lower === "json") tsType = "Record<string, any>";

      const optional = f.isNullable && !f.isPrimaryKey ? "?" : "";
      const comment = f.comment ? ` // ${f.comment}` : "";
      lines.push(`  ${f.name}${optional}: ${tsType};${comment}`);
    });
    lines.push(`}\n`);
  });

  return lines.join("\n");
}
