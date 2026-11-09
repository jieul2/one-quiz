"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMounted } from "@/lib/hooks/useMounted";
import { toast } from "@/lib/toast";
import { alertModal } from "@/lib/alert";
import { SaveStatus } from "@/components/common/SaveStatusIndicator";
import {
  ErdTable,
  ErdField,
  ErdRelation,
  FunctionalSpecItem,
  ApiSpecItem,
  RevisionSnapshot,
  ErdTab,
  ExportFormat,
  ProjectSummary,
} from "./types";
import { ErdGallery } from "./ErdGallery";
import { ErdHeader } from "./ErdHeader";
import { ErdCanvas } from "./ErdCanvas";
import { ErdSpecsTab } from "./ErdSpecsTab";
import { ErdHistoryTab } from "./ErdHistoryTab";
import { TableModal } from "./modals/TableModal";
import { RelationModal } from "./modals/RelationModal";
import { CommitModal } from "./modals/CommitModal";
import { ExportModal } from "./modals/ExportModal";
import { NewProjectModal } from "./modals/NewProjectModal";
import { ProjectListModal } from "./modals/ProjectListModal";
import { RevisionDiffModal } from "./modals/RevisionDiffModal";
import {
  SAMPLE_STARTER_TABLES,
  SAMPLE_STARTER_RELATIONS,
  SAMPLE_ARCHITECTURE_MD,
  SAMPLE_FUNCTIONAL_SPECS,
  SAMPLE_API_SPECS,
  BLANK_TABLES,
  BLANK_RELATIONS,
  BLANK_ARCHITECTURE_MD,
  BLANK_FUNCTIONAL_SPECS,
  BLANK_API_SPECS,
  generateMermaidErd,
  generateSqlDdl,
  generateTypeScriptTypes,
} from "./erdPresets";

export function ErdView() {
  const mounted = useMounted();
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  // 0. URL 쿼리 파라미터(?id=...) 기반 라우팅 지원 (프로젝트 로드맵 표준)
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");

  // 1. 활성 탭 (erd: 다이어그램, specs: 프로젝트 명세서, history: 형상관리 이력)
  const [activeTab, setActiveTab] = useState<ErdTab>("erd");

  // 2. 프로젝트 목록 관리 (다중 프로젝트 지원)
  const [projectsList, setProjectsList] = useState<ProjectSummary[]>([]);
  const [isProjectListModalOpen, setIsProjectListModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectTemplate, setNewProjectTemplate] = useState<"blank" | "sample">("blank");

  // 3. 현재 활성 프로젝트 명세서 핵심 상태
  const [specId, setSpecId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState("무제 프로젝트 명세서");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectVersion, setProjectVersion] = useState("1.0.0");
  const [projectStatus, setProjectStatus] = useState<"draft" | "in_progress" | "reviewed" | "approved">("in_progress");

  // 4. 세부 명세 모델 데이터
  const [tables, setTables] = useState<ErdTable[]>(SAMPLE_STARTER_TABLES);
  const [relations, setRelations] = useState<ErdRelation[]>(SAMPLE_STARTER_RELATIONS);
  const [architectureMd, setArchitectureMd] = useState<string>(SAMPLE_ARCHITECTURE_MD);
  const [functionalSpecs, setFunctionalSpecs] = useState<FunctionalSpecItem[]>(SAMPLE_FUNCTIONAL_SPECS);
  const [apiSpecs, setApiSpecs] = useState<ApiSpecItem[]>(SAMPLE_API_SPECS);
  const [revisions, setRevisions] = useState<RevisionSnapshot[]>([]);

  // 5. 캔버스 뷰포트 상태 (패닝 & 줌)
  const [pan, setPan] = useState({ x: 80, y: 80 });
  const [zoom, setZoom] = useState(1);

  // 6. 저장 상태 인디케이터 (Rule 51 규격)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedTimeStr, setSavedTimeStr] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 7. 모달 상태
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<ErdTable | null>(null);
  const [tableFormName, setTableFormName] = useState("");
  const [tableFormComment, setTableFormComment] = useState("");
  const [tableFormColor, setTableFormColor] = useState("primary");

  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const [relFromTable, setRelFromTable] = useState("");
  const [relFromField, setRelFromField] = useState("");
  const [relToTable, setRelToTable] = useState("");
  const [relToField, setRelToField] = useState("");
  const [relType, setRelType] = useState<"1:1" | "1:N" | "N:M">("1:N");
  const [relComment, setRelComment] = useState("");

  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [commitVersionInput, setCommitVersionInput] = useState("");
  const [commitMessageInput, setCommitMessageInput] = useState("");

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("mermaid");

  const [selectedRevisionForDiff, setSelectedRevisionForDiff] = useState<RevisionSnapshot | null>(null);

  // ========================================================
  // A. 데이터 로드 및 동기화
  // ========================================================
  const fetchProjectsList = useCallback(async () => {
    if (!userEmail) return [];
    try {
      const res = await fetch("/api/erd");
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          setProjectsList(list);
          return list;
        }
      }
    } catch (e) {
      console.error("Failed to fetch project specs:", e);
    }
    return [];
  }, [userEmail]);

  const loadProjectById = useCallback(async (id: string) => {
    try {
      setSaveStatus("saving");
      const res = await fetch(`/api/erd?id=${id}`);
      if (res.ok) {
        const doc = await res.json();
        setSpecId(doc._id);
        setProjectTitle(doc.title || "무제 프로젝트");
        setProjectDescription(doc.description || "");
        setProjectVersion(doc.version || "1.0.0");
        setProjectStatus(doc.status || "in_progress");
        setTables(Array.isArray(doc.tables) ? doc.tables : []);
        setRelations(Array.isArray(doc.relations) ? doc.relations : []);
        setArchitectureMd(doc.architectureMd || "");
        setFunctionalSpecs(Array.isArray(doc.functionalSpecs) ? doc.functionalSpecs : []);
        setApiSpecs(Array.isArray(doc.apiSpecs) ? doc.apiSpecs : []);
        setRevisions(Array.isArray(doc.revisions) ? doc.revisions : []);
        setSaveStatus("saved");
        setSavedTimeStr(new Date().toLocaleTimeString());
      } else {
        toast.error("프로젝트 데이터를 불러오지 못했습니다.");
        router.push("/erd");
      }
    } catch (e) {
      console.error("Failed to load project spec:", e);
      setSaveStatus("idle");
    }
  }, [router]);

  useEffect(() => {
    if (!mounted || !userEmail) return;
    fetchProjectsList();
  }, [mounted, userEmail, fetchProjectsList]);

  useEffect(() => {
    if (!mounted || !userEmail || !queryId) return;
    loadProjectById(queryId);
  }, [mounted, userEmail, queryId, loadProjectById]);

  // Ctrl + 마우스 휠 축소/확대 지원 (브라우저 기본 줌 방지)
  useEffect(() => {
    if (!queryId || activeTab !== "erd") return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        setZoom((z) => Math.min(2.5, Math.max(0.3, Number((z + delta).toFixed(2)))));
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [queryId, activeTab]);

  // ========================================================
  // B. 프로젝트 생성 / 삭제 / 전환 액션
  // ========================================================
  const handleCreateNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) {
      toast.warning("프로젝트 이름을 입력해주세요.");
      return;
    }

    const initTables = newProjectTemplate === "sample" ? SAMPLE_STARTER_TABLES : BLANK_TABLES;
    const initRelations = newProjectTemplate === "sample" ? SAMPLE_STARTER_RELATIONS : BLANK_RELATIONS;
    const initArch = newProjectTemplate === "sample" ? SAMPLE_ARCHITECTURE_MD : BLANK_ARCHITECTURE_MD;
    const initFunc = newProjectTemplate === "sample" ? SAMPLE_FUNCTIONAL_SPECS : BLANK_FUNCTIONAL_SPECS;
    const initApi = newProjectTemplate === "sample" ? SAMPLE_API_SPECS : BLANK_API_SPECS;

    try {
      const res = await fetch("/api/erd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newProjectTitle.trim(),
          description: newProjectDesc.trim(),
          version: "1.0.0",
          status: "in_progress",
          tables: initTables,
          relations: initRelations,
          architectureMd: initArch,
          functionalSpecs: initFunc,
          apiSpecs: initApi,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsNewProjectModalOpen(false);
        setNewProjectTitle("");
        setNewProjectDesc("");
        toast.success(`'${newProjectTitle.trim()}' 프로젝트가 성공적으로 생성되었습니다! 🎉`);
        if (data.spec?._id) {
          await fetchProjectsList();
          router.push(`/erd?id=${data.spec._id}`);
        }
      }
    } catch {
      toast.error("프로젝트 생성에 실패했습니다.");
    }
  };

  const handleDeleteProject = async (id: string, title: string) => {
    const confirmed = await alertModal.confirm({
      title: "프로젝트 삭제 확인",
      message: `'${title}' 프로젝트와 모든 ERD, 명세서 데이터를 삭제하시겠습니까?`,
      confirmText: "삭제",
      cancelText: "취소",
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/erd?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("프로젝트가 삭제되었습니다.");
        await fetchProjectsList();
        if (id === specId || id === queryId) {
          router.push("/erd");
        }
      }
    } catch {
      toast.error("프로젝트 삭제에 실패했습니다.");
    }
  };

  // ========================================================
  // C. 자동 저장 (Autosave with Debounce)
  // ========================================================
  const saveProjectData = useCallback(
    async (
      currentTables: ErdTable[],
      currentRelations: ErdRelation[],
      currentArch: string,
      currentFunc: FunctionalSpecItem[],
      currentApi: ApiSpecItem[]
    ) => {
      if (!userEmail) return;
      setSaveStatus("saving");

      try {
        const res = await fetch("/api/erd", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: specId,
            title: projectTitle,
            description: projectDescription,
            version: projectVersion,
            status: projectStatus,
            tables: currentTables,
            relations: currentRelations,
            architectureMd: currentArch,
            functionalSpecs: currentFunc,
            apiSpecs: currentApi,
          }),
        });

        if (res.ok) {
          setSaveStatus("saved");
          setSavedTimeStr(new Date().toLocaleTimeString());
        } else {
          setSaveStatus("idle");
        }
      } catch (err) {
        console.error("Autosave ERD failed:", err);
        setSaveStatus("idle");
      }
    },
    [userEmail, specId, projectTitle, projectDescription, projectVersion, projectStatus]
  );

  const triggerAutoSave = useCallback(
    (
      currentTables: ErdTable[],
      currentRelations: ErdRelation[],
      currentArch: string,
      currentFunc: FunctionalSpecItem[],
      currentApi: ApiSpecItem[]
    ) => {
      setSaveStatus("saving");
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        saveProjectData(currentTables, currentRelations, currentArch, currentFunc, currentApi);
      }, 1000);
    },
    [saveProjectData]
  );

  // ========================================================
  // D. 형상관리 커밋 & 롤백
  // ========================================================
  const handleCommitRevision = async () => {
    if (!commitMessageInput.trim()) {
      toast.warning("커밋 메시지(변경 내역 설명)를 입력해주세요.");
      return;
    }
    const versionTag = commitVersionInput.trim() || projectVersion;

    try {
      const res = await fetch("/api/erd/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specId,
          version: versionTag,
          message: commitMessageInput.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProjectVersion(versionTag);
        setRevisions(data.revisions || []);
        setIsCommitModalOpen(false);
        setCommitMessageInput("");
        toast.success(`버전 v${versionTag} 스냅샷이 성공적으로 커밋되었습니다! 🚀`);
      } else {
        toast.error("리비전 커밋에 실패했습니다.");
      }
    } catch {
      toast.error("서버 통신 중 오류가 발생했습니다.");
    }
  };

  const handleRollback = async (rev: RevisionSnapshot) => {
    const confirmed = await alertModal.confirm({
      title: "버전 롤백 확인",
      message: `v${rev.version} ('${rev.message}') 시점의 스냅샷으로 현재 설계를 복원하시겠습니까? (현재 변경 내용은 덮어씌워집니다)`,
      confirmText: "복원하기",
      cancelText: "취소",
    });
    if (!confirmed) return;

    if (rev.snapshot) {
      setTables(rev.snapshot.tables || []);
      setRelations(rev.snapshot.relations || []);
      setArchitectureMd(rev.snapshot.architectureMd || "");
      setFunctionalSpecs(rev.snapshot.functionalSpecs || []);
      setApiSpecs(rev.snapshot.apiSpecs || []);
      setProjectVersion(rev.version);
      triggerAutoSave(
        rev.snapshot.tables || [],
        rev.snapshot.relations || [],
        rev.snapshot.architectureMd || "",
        rev.snapshot.functionalSpecs || [],
        rev.snapshot.apiSpecs || []
      );
      toast.success(`v${rev.version} 시점으로 성공적으로 복원되었습니다. ⏱️`);
    }
  };

  // ========================================================
  // E. 테이블 & 필드 조작
  // ========================================================
  const handleOpenAddTableModal = () => {
    setEditingTable(null);
    setTableFormName("");
    setTableFormComment("");
    setTableFormColor("primary");
    setIsTableModalOpen(true);
  };

  const handleEditTable = (table: ErdTable) => {
    setEditingTable(table);
    setTableFormName(table.name);
    setTableFormComment(table.comment || "");
    setTableFormColor(table.color || "primary");
    setIsTableModalOpen(true);
  };

  const handleSaveTable = () => {
    if (!tableFormName.trim()) {
      toast.warning("테이블 이름을 입력해주세요.");
      return;
    }

    if (editingTable) {
      const updated = tables.map((t) =>
        t.id === editingTable.id
          ? { ...t, name: tableFormName.trim(), comment: tableFormComment.trim(), color: tableFormColor }
          : t
      );
      setTables(updated);
      triggerAutoSave(updated, relations, architectureMd, functionalSpecs, apiSpecs);
      toast.success("테이블 정보가 수정되었습니다.");
    } else {
      const newTable: ErdTable = {
        id: `tbl_${Date.now()}`,
        name: tableFormName.trim(),
        comment: tableFormComment.trim(),
        color: tableFormColor,
        x: Math.round((-pan.x + 360) / zoom),
        y: Math.round((-pan.y + 240) / zoom),
        fields: [
          {
            id: `f_${Date.now()}_1`,
            name: "_id",
            type: "ObjectId",
            isPrimaryKey: true,
            isNullable: false,
            comment: "기본 키",
          },
          {
            id: `f_${Date.now()}_2`,
            name: "createdAt",
            type: "Date",
            comment: "생성 일시",
          },
        ],
      };
      const updated = [...tables, newTable];
      setTables(updated);
      triggerAutoSave(updated, relations, architectureMd, functionalSpecs, apiSpecs);
      toast.success(`'${newTable.name}' 테이블이 추가되었습니다.`);
    }
    setIsTableModalOpen(false);
  };

  const handleDeleteTable = async (tableId: string) => {
    const target = tables.find((t) => t.id === tableId);
    const confirmed = await alertModal.confirm({
      title: "테이블 삭제",
      message: `'${target?.name || "선택한"}' 테이블과 연결된 외래키 관계를 모두 삭제하시겠습니까?`,
      confirmText: "삭제",
      cancelText: "취소",
      isDestructive: true,
    });
    if (!confirmed) return;

    const updatedTables = tables.filter((t) => t.id !== tableId);
    const updatedRelations = relations.filter(
      (r) => r.fromTable !== tableId && r.toTable !== tableId
    );
    setTables(updatedTables);
    setRelations(updatedRelations);
    triggerAutoSave(updatedTables, updatedRelations, architectureMd, functionalSpecs, apiSpecs);
    toast.success("테이블이 삭제되었습니다.");
  };

  const handleAddField = (tableId: string) => {
    const newField: ErdField = {
      id: `fld_${Date.now()}`,
      name: "new_column",
      type: "String",
      isNullable: true,
      comment: "새로운 컬럼",
    };
    const updated = tables.map((t) => (t.id === tableId ? { ...t, fields: [...t.fields, newField] } : t));
    setTables(updated);
    triggerAutoSave(updated, relations, architectureMd, functionalSpecs, apiSpecs);
  };

  const handleUpdateField = (tableId: string, fieldId: string, partial: Partial<ErdField>) => {
    const updated = tables.map((t) => {
      if (t.id !== tableId) return t;
      return {
        ...t,
        fields: t.fields.map((f) => (f.id === fieldId ? { ...f, ...partial } : f)),
      };
    });
    setTables(updated);
    triggerAutoSave(updated, relations, architectureMd, functionalSpecs, apiSpecs);
  };

  const handleDeleteField = (tableId: string, fieldId: string) => {
    const updated = tables.map((t) => {
      if (t.id !== tableId) return t;
      return { ...t, fields: t.fields.filter((f) => f.id !== fieldId) };
    });
    setTables(updated);
    triggerAutoSave(updated, relations, architectureMd, functionalSpecs, apiSpecs);
  };

  const handleUpdateTablePos = (tableId: string, dx: number, dy: number) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, x: Math.round(t.x + dx), y: Math.round(t.y + dy) } : t))
    );
  };

  const handleTableDragEnd = () => {
    triggerAutoSave(tables, relations, architectureMd, functionalSpecs, apiSpecs);
  };

  // ========================================================
  // F. 관계(Relations) 조작
  // ========================================================
  const handleOpenAddRelationModal = () => {
    if (tables.length < 2) {
      toast.warning("관계를 연결하려면 최소 2개 이상의 테이블이 필요합니다.");
      return;
    }
    setRelFromTable(tables[0].id);
    setRelFromField(tables[0].fields[0]?.id || "");
    setRelToTable(tables[1].id);
    setRelToField(tables[1].fields[0]?.id || "");
    setRelType("1:N");
    setRelComment("");
    setIsRelationModalOpen(true);
  };

  const handleSaveRelation = () => {
    if (!relFromTable || !relToTable || !relFromField || !relToField) {
      toast.warning("시작 및 대상 테이블과 필드를 모두 선택해주세요.");
      return;
    }
    const newRel: ErdRelation = {
      id: `rel_${Date.now()}`,
      fromTable: relFromTable,
      fromField: relFromField,
      toTable: relToTable,
      toField: relToField,
      type: relType,
      comment: relComment.trim() || undefined,
    };
    const updated = [...relations, newRel];
    setRelations(updated);
    triggerAutoSave(tables, updated, architectureMd, functionalSpecs, apiSpecs);
    setIsRelationModalOpen(false);
    toast.success("테이블 간 관계가 성공적으로 연결되었습니다! 🔗");
  };

  const handleDeleteRelation = (relId: string) => {
    const updated = relations.filter((r) => r.id !== relId);
    setRelations(updated);
    triggerAutoSave(tables, updated, architectureMd, functionalSpecs, apiSpecs);
    toast.success("관계선이 삭제되었습니다.");
  };

  // ========================================================
  // G. 기본 샘플 스타터 로드
  // ========================================================
  const handleLoadSampleTemplate = async () => {
    const confirmed = await alertModal.confirm({
      title: "기본 스타터 샘플 로드",
      message:
        "표준 User, Post, Comment 3개 엔티티 샘플을 현재 워크스페이스에 불러오시겠습니까? (기존 편집 내용은 덮어씌워집니다)",
      confirmText: "불러오기",
      cancelText: "취소",
    });
    if (!confirmed) return;

    setTables(SAMPLE_STARTER_TABLES);
    setRelations(SAMPLE_STARTER_RELATIONS);
    setArchitectureMd(SAMPLE_ARCHITECTURE_MD);
    setFunctionalSpecs(SAMPLE_FUNCTIONAL_SPECS);
    setApiSpecs(SAMPLE_API_SPECS);
    triggerAutoSave(
      SAMPLE_STARTER_TABLES,
      SAMPLE_STARTER_RELATIONS,
      SAMPLE_ARCHITECTURE_MD,
      SAMPLE_FUNCTIONAL_SPECS,
      SAMPLE_API_SPECS
    );
    toast.success("기본 스타터 스키마가 로드되었습니다! ✨");
  };

  // ========================================================
  // H. 코드 내보내기 (Export)
  // ========================================================
  const exportCode = useMemo(() => {
    if (exportFormat === "mermaid") return generateMermaidErd(tables, relations);
    if (exportFormat === "sql") return generateSqlDdl(tables, relations);
    if (exportFormat === "ts") return generateTypeScriptTypes(tables);
    return JSON.stringify(
      {
        projectTitle,
        version: projectVersion,
        exportedAt: new Date().toISOString(),
        tables,
        relations,
        architectureMd,
        functionalSpecs,
        apiSpecs,
        revisions,
      },
      null,
      2
    );
  }, [
    exportFormat,
    tables,
    relations,
    projectTitle,
    projectVersion,
    architectureMd,
    functionalSpecs,
    apiSpecs,
    revisions,
  ]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(exportCode);
      toast.success("클립보드에 코드가 성공적으로 복사되었습니다! 📋");
    } catch {
      toast.error("클립보드 복사 실패");
    }
  };

  const handleDownloadFile = () => {
    const extensions = { mermaid: "mmd", sql: "sql", ts: "ts", json: "json" };
    const blob = new Blob([exportCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectTitle.replace(/\s+/g, "_")}_${projectVersion}.${extensions[exportFormat]}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("파일 다운로드가 완료되었습니다.");
  };

  // 🌟 프로젝트 미선택 시: 카드 갤러리 목록 뷰 제공 (?id=... 쿼리 파라미터 표준)
  if (!queryId) {
    return (
      <>
        <ErdGallery
          projectsList={projectsList}
          searchQuery={projectSearchQuery}
          onSearchChange={setProjectSearchQuery}
          onSelectProject={(id) => router.push(`/erd?id=${id}`)}
          onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
          onDeleteProject={handleDeleteProject}
        />

        <NewProjectModal
          isOpen={isNewProjectModalOpen}
          title={newProjectTitle}
          description={newProjectDesc}
          template={newProjectTemplate}
          onTitleChange={setNewProjectTitle}
          onDescriptionChange={setNewProjectDesc}
          onTemplateChange={setNewProjectTemplate}
          onSubmit={handleCreateNewProject}
          onClose={() => setIsNewProjectModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="w-full space-y-4 pb-16 text-on-surface select-none">
      {/* 1. 최상단 헤더 및 탭 네비게이션 */}
      <ErdHeader
        projectTitle={projectTitle}
        projectVersion={projectVersion}
        projectDescription={projectDescription}
        tableCount={tables.length}
        relationCount={relations.length}
        projectsCount={projectsList.length}
        revisionsCount={revisions.length}
        activeTab={activeTab}
        saveStatus={saveStatus}
        savedTimeStr={savedTimeStr}
        onBackToList={() => router.push("/erd")}
        onOpenProjectListModal={() => setIsProjectListModalOpen(true)}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
        onOpenCommitModal={() => {
          setCommitVersionInput(projectVersion);
          setIsCommitModalOpen(true);
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onLoadSampleTemplate={handleLoadSampleTemplate}
        onChangeTab={setActiveTab}
      />

      {/* 2. 탭별 메인 뷰 */}
      {activeTab === "erd" && (
        <ErdCanvas
          tables={tables}
          relations={relations}
          pan={pan}
          zoom={zoom}
          onPanChange={setPan}
          onZoomChange={setZoom}
          onAddTable={handleOpenAddTableModal}
          onAddRelation={handleOpenAddRelationModal}
          onResetView={() => {
            setZoom(1);
            setPan({ x: 80, y: 80 });
          }}
          onEditTable={handleEditTable}
          onDeleteTable={handleDeleteTable}
          onAddField={handleAddField}
          onUpdateField={handleUpdateField}
          onDeleteField={handleDeleteField}
          onDeleteRelation={handleDeleteRelation}
          onUpdateTablePos={handleUpdateTablePos}
          onDragEnd={handleTableDragEnd}
        />
      )}

      {activeTab === "specs" && (
        <ErdSpecsTab
          architectureMd={architectureMd}
          functionalSpecs={functionalSpecs}
          apiSpecs={apiSpecs}
          onArchitectureMdChange={(val) => {
            setArchitectureMd(val);
            triggerAutoSave(tables, relations, val, functionalSpecs, apiSpecs);
          }}
          onAddFunctionalSpec={() => {
            const newItem: FunctionalSpecItem = {
              id: `fn_${Date.now()}`,
              module: "신규 모듈",
              title: "새 기능 요구사항",
              description: "기능에 대한 상세 정의 및 동작 방식을 입력하세요.",
              priority: "medium",
              status: "todo",
              assignee: "담당자",
            };
            const updated = [...functionalSpecs, newItem];
            setFunctionalSpecs(updated);
            triggerAutoSave(tables, relations, architectureMd, updated, apiSpecs);
          }}
          onUpdateFunctionalSpec={(id, partial) => {
            const updated = functionalSpecs.map((f) => (f.id === id ? { ...f, ...partial } : f));
            setFunctionalSpecs(updated);
            triggerAutoSave(tables, relations, architectureMd, updated, apiSpecs);
          }}
          onDeleteFunctionalSpec={(id) => {
            const updated = functionalSpecs.filter((f) => f.id !== id);
            setFunctionalSpecs(updated);
            triggerAutoSave(tables, relations, architectureMd, updated, apiSpecs);
          }}
          onAddApiSpec={() => {
            const newApi: ApiSpecItem = {
              id: `api_${Date.now()}`,
              method: "GET",
              endpoint: "/api/new-route",
              description: "새로운 API 엔드포인트 설명",
              requestParams: "Query or Body",
              authRequired: "user",
              responseStatus: "200 OK",
            };
            const updated = [...apiSpecs, newApi];
            setApiSpecs(updated);
            triggerAutoSave(tables, relations, architectureMd, functionalSpecs, updated);
          }}
          onUpdateApiSpec={(id, partial) => {
            const updated = apiSpecs.map((a) => (a.id === id ? { ...a, ...partial } : a));
            setApiSpecs(updated);
            triggerAutoSave(tables, relations, architectureMd, functionalSpecs, updated);
          }}
          onDeleteApiSpec={(id) => {
            const updated = apiSpecs.filter((a) => a.id !== id);
            setApiSpecs(updated);
            triggerAutoSave(tables, relations, architectureMd, functionalSpecs, updated);
          }}
        />
      )}

      {activeTab === "history" && (
        <ErdHistoryTab
          revisions={revisions}
          onSelectRevisionForDiff={setSelectedRevisionForDiff}
          onRollback={handleRollback}
        />
      )}

      {/* 3. 공통 모달군 */}
      <TableModal
        isOpen={isTableModalOpen}
        editingTable={editingTable}
        name={tableFormName}
        comment={tableFormComment}
        color={tableFormColor}
        onNameChange={setTableFormName}
        onCommentChange={setTableFormComment}
        onColorChange={setTableFormColor}
        onSave={handleSaveTable}
        onClose={() => setIsTableModalOpen(false)}
      />

      <RelationModal
        isOpen={isRelationModalOpen}
        tables={tables}
        fromTable={relFromTable}
        fromField={relFromField}
        toTable={relToTable}
        toField={relToField}
        relType={relType}
        comment={relComment}
        onFromTableChange={(tId) => {
          setRelFromTable(tId);
          const t = tables.find((tb) => tb.id === tId);
          if (t && t.fields[0]) setRelFromField(t.fields[0].id);
        }}
        onFromFieldChange={setRelFromField}
        onToTableChange={(tId) => {
          setRelToTable(tId);
          const t = tables.find((tb) => tb.id === tId);
          if (t && t.fields[0]) setRelToField(t.fields[0].id);
        }}
        onToFieldChange={setRelToField}
        onRelTypeChange={setRelType}
        onCommentChange={setRelComment}
        onSave={handleSaveRelation}
        onClose={() => setIsRelationModalOpen(false)}
      />

      <CommitModal
        isOpen={isCommitModalOpen}
        version={commitVersionInput}
        message={commitMessageInput}
        tableCount={tables.length}
        relationCount={relations.length}
        functionalSpecsCount={functionalSpecs.length}
        apiSpecsCount={apiSpecs.length}
        onVersionChange={setCommitVersionInput}
        onMessageChange={setCommitMessageInput}
        onCommit={handleCommitRevision}
        onClose={() => setIsCommitModalOpen(false)}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        format={exportFormat}
        code={exportCode}
        onFormatChange={setExportFormat}
        onCopy={handleCopyCode}
        onDownload={handleDownloadFile}
        onClose={() => setIsExportModalOpen(false)}
      />

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        title={newProjectTitle}
        description={newProjectDesc}
        template={newProjectTemplate}
        onTitleChange={setNewProjectTitle}
        onDescriptionChange={setNewProjectDesc}
        onTemplateChange={setNewProjectTemplate}
        onSubmit={handleCreateNewProject}
        onClose={() => setIsNewProjectModalOpen(false)}
      />

      <ProjectListModal
        isOpen={isProjectListModalOpen}
        projectsList={projectsList}
        currentProjectId={specId}
        onSelectProject={(id) => {
          loadProjectById(id);
          setIsProjectListModalOpen(false);
          toast.success("프로젝트를 불러왔습니다. 📂");
        }}
        onDeleteProject={handleDeleteProject}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
        onClose={() => setIsProjectListModalOpen(false)}
      />

      <RevisionDiffModal
        revision={selectedRevisionForDiff}
        onRollback={handleRollback}
        onClose={() => setSelectedRevisionForDiff(null)}
      />
    </div>
  );
}
