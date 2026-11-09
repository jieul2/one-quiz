"use client";

import React from "react";
import { FileText, Layers, Plus, Trash2, Code2 } from "lucide-react";
import { FunctionalSpecItem, ApiSpecItem } from "./types";

interface ErdSpecsTabProps {
  architectureMd: string;
  functionalSpecs: FunctionalSpecItem[];
  apiSpecs: ApiSpecItem[];
  onArchitectureMdChange: (md: string) => void;
  onAddFunctionalSpec: () => void;
  onUpdateFunctionalSpec: (id: string, partial: Partial<FunctionalSpecItem>) => void;
  onDeleteFunctionalSpec: (id: string) => void;
  onAddApiSpec: () => void;
  onUpdateApiSpec: (id: string, partial: Partial<ApiSpecItem>) => void;
  onDeleteApiSpec: (id: string) => void;
}

export function ErdSpecsTab({
  architectureMd,
  functionalSpecs,
  apiSpecs,
  onArchitectureMdChange,
  onAddFunctionalSpec,
  onUpdateFunctionalSpec,
  onDeleteFunctionalSpec,
  onAddApiSpec,
  onUpdateApiSpec,
  onDeleteApiSpec,
}: ErdSpecsTabProps) {
  return (
    <div className="space-y-6">
      {/* 시스템 아키텍처 개요 (마크다운) */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h2 className="ui-section-title">시스템 아키텍처 및 설계 원칙</h2>
          </div>
          <span className="ui-caption text-on-surface-variant font-mono">Markdown 서술 지원</span>
        </div>

        <textarea
          value={architectureMd}
          onChange={(e) => onArchitectureMdChange(e.target.value)}
          rows={10}
          className="w-full p-4 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface text-xs font-mono leading-relaxed focus:outline-none focus:border-primary"
          placeholder="시스템 설계 아키텍처, 디렉터리 구성, 기술 스택 등을 마크다운으로 자유롭게 작성하세요..."
        />
      </div>

      {/* 기능 명세서 (Functional Specs) */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-primary" />
            <h2 className="ui-section-title">주요 기능 명세서 ({functionalSpecs.length}개)</h2>
          </div>
          <button
            type="button"
            onClick={onAddFunctionalSpec}
            className="ui-button px-3 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>+ 기능 추가</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant font-semibold">
                <th className="py-2.5 px-3 w-28">모듈</th>
                <th className="py-2.5 px-3 w-48">기능명</th>
                <th className="py-2.5 px-3">상세 명세</th>
                <th className="py-2.5 px-3 w-24">우선순위</th>
                <th className="py-2.5 px-3 w-28">진행 상태</th>
                <th className="py-2.5 px-3 w-24">담당</th>
                <th className="py-2.5 px-3 w-12 text-center">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {functionalSpecs.map((item) => (
                <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-2 px-3 font-semibold text-primary">
                    <input
                      type="text"
                      value={item.module}
                      onChange={(e) => onUpdateFunctionalSpec(item.id, { module: e.target.value })}
                      className="w-full bg-transparent font-semibold text-primary focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3 font-medium text-on-surface">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => onUpdateFunctionalSpec(item.id, { title: e.target.value })}
                      className="w-full bg-transparent font-medium text-on-surface focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3 text-on-surface-variant">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => onUpdateFunctionalSpec(item.id, { description: e.target.value })}
                      className="w-full bg-transparent text-on-surface-variant focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={item.priority}
                      onChange={(e) =>
                        onUpdateFunctionalSpec(item.id, { priority: e.target.value as FunctionalSpecItem["priority"] })
                      }
                      className="text-[11px] font-semibold px-2 py-1 rounded bg-surface-container-low border border-outline-variant focus:outline-none"
                    >
                      <option value="high">상 (High)</option>
                      <option value="medium">중 (Med)</option>
                      <option value="low">하 (Low)</option>
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={item.status}
                      onChange={(e) =>
                        onUpdateFunctionalSpec(item.id, { status: e.target.value as FunctionalSpecItem["status"] })
                      }
                      className="text-[11px] font-semibold px-2 py-1 rounded bg-surface-container-low border border-outline-variant focus:outline-none"
                    >
                      <option value="todo">대기</option>
                      <option value="in_progress">진행중</option>
                      <option value="done">완료</option>
                    </select>
                  </td>
                  <td className="py-2 px-3 text-on-surface-variant font-mono">
                    <input
                      type="text"
                      value={item.assignee || ""}
                      onChange={(e) => onUpdateFunctionalSpec(item.id, { assignee: e.target.value })}
                      className="w-full bg-transparent text-xs font-mono text-on-surface-variant focus:outline-none"
                      placeholder="담당자"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteFunctionalSpec(item.id)}
                      className="p-1 rounded text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* API 엔드포인트 명세서 (API Specs) */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
          <div className="flex items-center gap-2">
            <Code2 size={18} className="text-primary" />
            <h2 className="ui-section-title">API 엔드포인트 명세서 ({apiSpecs.length}개)</h2>
          </div>
          <button
            type="button"
            onClick={onAddApiSpec}
            className="ui-button px-3 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>+ API 추가</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant font-semibold">
                <th className="py-2.5 px-3 w-24">메서드</th>
                <th className="py-2.5 px-3 w-60">경로 (Endpoint)</th>
                <th className="py-2.5 px-3">기능 설명</th>
                <th className="py-2.5 px-3 w-40">파라미터 / 페이로드</th>
                <th className="py-2.5 px-3 w-24">인증</th>
                <th className="py-2.5 px-3 w-28">응답</th>
                <th className="py-2.5 px-3 w-12 text-center">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {apiSpecs.map((item) => {
                const methodColors: Record<string, string> = {
                  GET: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                  POST: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
                  PUT: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                  DELETE: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
                  PATCH: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
                };
                const colorClass = methodColors[item.method] || "bg-surface-container text-on-surface";

                return (
                  <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors font-mono">
                    <td className="py-2 px-3">
                      <select
                        value={item.method}
                        onChange={(e) =>
                          onUpdateApiSpec(item.id, { method: e.target.value as ApiSpecItem["method"] })
                        }
                        className={`text-[11px] font-bold px-2 py-0.5 rounded border focus:outline-none ${colorClass}`}
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 font-semibold text-on-surface">
                      <input
                        type="text"
                        value={item.endpoint}
                        onChange={(e) => onUpdateApiSpec(item.id, { endpoint: e.target.value })}
                        className="w-full bg-transparent font-semibold text-on-surface focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 font-sans text-on-surface-variant">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => onUpdateApiSpec(item.id, { description: e.target.value })}
                        className="w-full bg-transparent text-on-surface-variant font-sans focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-on-surface-variant text-[11px]">
                      <input
                        type="text"
                        value={item.requestParams || ""}
                        onChange={(e) => onUpdateApiSpec(item.id, { requestParams: e.target.value })}
                        className="w-full bg-transparent text-on-surface-variant focus:outline-none"
                        placeholder="파라미터/바디"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={item.authRequired}
                        onChange={(e) =>
                          onUpdateApiSpec(item.id, { authRequired: e.target.value as ApiSpecItem["authRequired"] })
                        }
                        className="text-[11px] px-2 py-0.5 rounded bg-surface-container-low border border-outline-variant focus:outline-none"
                      >
                        <option value="none">Public</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                      <input
                        type="text"
                        value={item.responseStatus}
                        onChange={(e) => onUpdateApiSpec(item.id, { responseStatus: e.target.value })}
                        className="w-full bg-transparent text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteApiSpec(item.id)}
                        className="p-1 rounded text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
