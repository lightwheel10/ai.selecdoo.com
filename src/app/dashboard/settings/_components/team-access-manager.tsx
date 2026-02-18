"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth/roles";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeamMember {
  id: string;
  email: string;
  role: AppRole;
  created_at: string | null;
  last_sign_in_at: string | null;
  is_bootstrap_admin: boolean;
}

function formatDate(ts: string | null): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RoleBadge({ role }: { role: AppRole }) {
  const styles: Record<AppRole, { bg: string; border: string; color: string }> = {
    admin: {
      bg: "rgba(202,255,4,0.12)",
      border: "1.5px solid rgba(202,255,4,0.35)",
      color: "var(--primary-text)",
    },
    operator: {
      bg: "rgba(90,200,250,0.10)",
      border: "1.5px solid rgba(90,200,250,0.30)",
      color: "#5AC8FA",
    },
    viewer: {
      bg: "rgba(160,160,160,0.10)",
      border: "1.5px solid rgba(160,160,160,0.25)",
      color: "var(--muted-foreground)",
    },
  };

  const style = styles[role];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em]"
      style={{
        fontFamily: "var(--font-mono)",
        backgroundColor: style.bg,
        border: style.border,
        color: style.color,
      }}
    >
      {role}
    </span>
  );
}

export function TeamAccessManager() {
  const t = useTranslations("Settings");

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("operator");

  const roles = useMemo(
    () => [
      { value: "admin", label: t("adminRole") },
      { value: "operator", label: t("operatorRole") },
      { value: "viewer", label: t("viewerRole") },
    ] as const,
    [t]
  );

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team/roles", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? t("loadFailed"));
      }
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("loadFailed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleAssign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || submitting) return;

    setSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch("/api/team/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          role,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? t("updateFailed"));
      }

      toast.success(t("roleUpdated"), {
        description: t("roleUpdatedDescription", {
          email: normalizedEmail,
          role,
        }),
      });
      setEmail("");
      await loadMembers();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("updateFailed");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="border-2 p-6"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mb-4">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
          style={{ fontFamily: "var(--font-mono)", color: "var(--primary-text)" }}
        >
          {t("teamTitle")}
        </p>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {t("teamDescription")}
        </p>
      </div>

      <form
        onSubmit={handleAssign}
        className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2 mb-5"
      >
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          className="border-2"
          style={{
            borderColor: "var(--border)",
            borderRadius: 0,
            backgroundColor: "var(--input)",
          }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as AppRole)}
          className="px-3 py-2 text-[11px] border-2 outline-none"
          style={{
            borderColor: "var(--border)",
            borderRadius: 0,
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {roles.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!email.trim() || submitting}
          className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-all disabled:opacity-40 disabled:pointer-events-none"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            borderRadius: 0,
          }}
        >
          {submitting ? t("assigning") : t("assignRole")}
        </button>
      </form>

      <div className="flex items-center justify-between mb-2">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {t("membersTitle")}
        </p>
        <button
          type="button"
          onClick={loadMembers}
          className="text-[10px] font-bold uppercase tracking-[0.15em] hover:opacity-80"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {t("refresh")}
        </button>
      </div>

      <div className="border-2 overflow-auto" style={{ borderColor: "var(--border)" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colEmail")}</TableHead>
              <TableHead>{t("colRole")}</TableHead>
              <TableHead>{t("colLastSignIn")}</TableHead>
              <TableHead>{t("colCreatedAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.15em]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {t("loadingMembers")}
                  </span>
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.15em]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {t("noMembers")}
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="text-[11px]">{member.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <RoleBadge role={member.role} />
                      {member.is_bootstrap_admin && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-[0.15em]"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          {t("bootstrap")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {formatDate(member.last_sign_in_at)}
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {formatDate(member.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
