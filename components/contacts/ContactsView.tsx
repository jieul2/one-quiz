"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { UserPlus, Search, Mail, Phone, Trash2 } from "lucide-react";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";
import { toast } from "@/lib/toast";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  label: string;
}

const DEFAULT_CONTACTS: Contact[] = [];

export function ContactsView() {
  const { data: session } = useSession();
  const [contacts, setContacts] = useState<Contact[]>(DEFAULT_CONTACTS);
  const [selectedLabel, setSelectedLabel] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState("스터디원");
  const [newLabel, setNewLabel] = useState("팀원");

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedTimeStr, setSavedTimeStr] = useState<string>("");

  const markSaved = useCallback(() => {
    const now = new Date();
    setSavedTimeStr(
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    );
    setSaveStatus("saved");
  }, []);

  // 1. DB 또는 localStorage 로드
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (session?.user?.email) {
        try {
          const res = await fetch("/api/contacts");
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && isMounted) {
              setContacts(
                data.map((c: { id?: string; _id?: string; name: string; email?: string; phone?: string; role?: string; label?: string }) => ({
                  id: c.id || c._id || String(Date.now()),
                  name: c.name,
                  email: c.email || "",
                  phone: c.phone || "",
                  role: c.role || "팀원",
                  label: c.label || "팀원",
                }))
              );
              markSaved();
              return;
            }
          }
        } catch (e) {
          console.warn("DB load failed, falling back to localStorage", e);
        }
      }

      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("onequiz_contacts_data");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && isMounted) {
              setContacts(parsed);
              markSaved();
              return;
            }
          } catch {}
        }
      }

      if (isMounted) {
        setContacts([]);
        markSaved();
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [session, markSaved]);

  const persistContacts = useCallback(
    async (items: Contact[]) => {
      setSaveStatus("saving");
      setContacts(items);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("onequiz_contacts_data", JSON.stringify(items));
        } catch {}
      }

      if (session?.user?.email) {
        try {
          const res = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(items),
          });
          if (!res.ok) throw new Error("DB 저장 실패");
          markSaved();
        } catch {
          setSaveStatus("error");
        }
      } else {
        markSaved();
      }
    },
    [session, markSaved]
  );

  const filtered = contacts.filter((c) => {
    const matchesLabel = selectedLabel === "전체" || c.label === selectedLabel;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);
    return matchesLabel && matchesSearch;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const item: Contact = {
      id: Date.now().toString(),
      name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim(),
      role: newRole.trim(),
      label: newLabel,
    };
    const updated = [item, ...contacts];
    await persistContacts(updated);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setShowAddModal(false);
    toast.success("새 연락처가 등록되었습니다.");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 연락처를 삭제하시겠습니까?")) return;
    const updated = contacts.filter((c) => c.id !== id);
    await persistContacts(updated);
    toast.info("연락처가 삭제되었습니다.");
  };

  return (
    <div className="flex flex-col w-full gap-space-lg text-on-surface">
      {/* 상단 헤더 (플랫 헤더 표준) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">연락처</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono text-[11px] font-semibold">
            {contacts.length}명
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              placeholder="이름·이메일 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-container-lowest pl-8 pr-3 py-1.5 rounded-md border border-outline-variant text-xs text-on-surface w-40 sm:w-48 font-light focus:outline-hidden focus:border-primary"
            />
          </div>

          {session?.user ? (
            <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-low text-on-surface-variant text-xs font-mono border border-outline-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>게스트 모드</span>
            </div>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>연락처 추가</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
        {/* Label Sidebar */}
        <div className="md:col-span-3 p-3 bg-surface-container-lowest rounded-lg border border-outline-variant shadow-xs flex flex-col gap-1">
          <span className="text-[11px] text-on-surface-variant font-bold px-1 mb-1">라벨 필터</span>
          {["전체", "팀원", "멘토", "기타"].map((lbl) => (
            <button
              key={lbl}
              onClick={() => setSelectedLabel(lbl)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                selectedLabel === lbl
                  ? "bg-primary text-on-primary shadow-xs"
                  : "hover:bg-surface-container text-on-surface-variant"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* Contact Cards Grid */}
        <div className="md:col-span-9">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest/50">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-3">
                <Mail className="w-5 h-5 text-on-surface-variant" />
              </div>
              <p className="text-sm font-semibold text-on-surface">등록된 연락처가 없습니다</p>
              <p className="text-xs text-on-surface-variant mt-1 mb-4">
                {searchQuery ? "검색 조건과 일치하는 연락처가 없습니다." : "팀원이나 멘토를 추가하여 소통해보세요."}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>연락처 추가</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant hover:border-primary/50 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-sm">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-on-surface">{c.name}</h3>
                        <span className="text-[11px] text-on-surface-variant font-medium">{c.role}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-surface-container text-[11px] font-semibold text-on-surface-variant border border-outline-variant">
                      {c.label}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs text-on-surface-variant pt-2 border-t border-outline-variant">
                    {c.email && (
                      <div className="flex items-center gap-2 font-mono">
                        <Mail className="w-3.5 h-3.5 shrink-0 text-primary" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-2 font-mono">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-[11px] text-on-surface-variant hover:text-red-500 transition-opacity flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>삭제</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl p-5 flex flex-col gap-4">
            <span className="text-base font-bold text-on-surface">새 연락처 추가</span>
            <form onSubmit={handleAdd} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">이름</label>
                <input
                  type="text"
                  required
                  placeholder="예: 홍길동"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-surface-container px-3 py-2 rounded-md border border-outline-variant text-xs text-on-surface focus:outline-hidden focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">이메일</label>
                <input
                  type="email"
                  placeholder="예: user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-surface-container px-3 py-2 rounded-md border border-outline-variant text-xs text-on-surface focus:outline-hidden focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">연락처</label>
                <input
                  type="text"
                  placeholder="예: 010-1234-5678"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="bg-surface-container px-3 py-2 rounded-md border border-outline-variant text-xs text-on-surface focus:outline-hidden focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant">직책/역할</label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="bg-surface-container px-3 py-2 rounded-md border border-outline-variant text-xs text-on-surface focus:outline-hidden focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant">분류 라벨</label>
                  <select
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="bg-surface-container px-3 py-2 rounded-md border border-outline-variant text-xs text-on-surface focus:outline-hidden focus:border-primary"
                  >
                    <option value="팀원">팀원</option>
                    <option value="멘토">멘토</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs text-on-surface-variant hover:bg-surface-container cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-primary text-on-primary font-bold text-xs cursor-pointer shadow-xs"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
