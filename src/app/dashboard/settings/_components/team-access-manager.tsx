"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { APP_PERMISSIONS, type AppPermission, type AppRole } from "@/lib/auth/roles";
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
  permissions: AppPermission[];
  is_customized: boolean;
  created_at: string | null;
  last_sign_in_at: string | null;
  is_bootstrap_admin: boolean;
}

interface PermissionDefinition {
  permission: AppPermission;
  labelKey: string;
  descriptionKey: string;
}

const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    permission: "admin:access",
    labelKey: "permissionAdminAccessLabel",
    descriptionKey: "permissionAdminAccessDescription",
  },
  {
    permission: "settings:access",
    labelKey: "permissionSettingsAccessLabel",
    descriptionKey: "permissionSettingsAccessDescription",
  },
  {
    permission: "team:manage_roles",
    labelKey: "permissionTeamManageRolesLabel",
    descriptionKey: "permissionTeamManageRolesDescription",
  },
  {
    permission: "store:create",
    labelKey: "permissionStoreCreateLabel",
    descriptionKey: "permissionStoreCreateDescription",
  },
  {
    permission: "store:update_status",
    labelKey: "permissionStoreUpdateStatusLabel",
    descriptionKey: "permissionStoreUpdateStatusDescription",
  },
  {
    permission: "store:edit_details",
    labelKey: "permissionStoreEditDetailsLabel",
    descriptionKey: "permissionStoreEditDetailsDescription",
  },
  {
    permission: "store:delete",
    labelKey: "permissionStoreDeleteLabel",
    descriptionKey: "permissionStoreDeleteDescription",
  },
  {
    permission: "scrape:start",
    labelKey: "permissionScrapeStartLabel",
    descriptionKey: "permissionScrapeStartDescription",
  },
  {
    permission: "scrape:view",
    labelKey: "permissionScrapeViewLabel",
    descriptionKey: "permissionScrapeViewDescription",
  },
  {
    permission: "monitoring:run",
    labelKey: "permissionMonitoringRunLabel",
    descriptionKey: "permissionMonitoringRunDescription",
  },
  {
    permission: "product:delete",
    labelKey: "permissionProductDeleteLabel",
    descriptionKey: "permissionProductDeleteDescription",
  },
];

function formatDate(ts: string | null): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function listEquals(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function PermissionToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label className="inline-flex items-center justify-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <div
        className="w-4 h-4 border-2 flex items-center justify-center transition-colors"
        style={{
          backgroundColor: checked ? "var(--primary)" : "transparent",
          borderColor: checked ? "var(--primary-text)" : "var(--border)",
          opacity: disabled ? 0.4 : 1,
        }}
      >
        {checked && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="var(--primary-foreground)"
            strokeWidth="2"
            strokeLinecap="square"
          >
            <path d="M2 5l2.5 2.5L8 3" />
          </svg>
        )}
      </div>
    </label>
  );
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
  const [savingMemberPermissions, setSavingMemberPermissions] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("operator");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberPermissions, setMemberPermissions] = useState<AppPermission[]>([]);

  const roles = useMemo(
    () => [
      { value: "admin", label: t("adminRole") },
      { value: "operator", label: t("operatorRole") },
      { value: "viewer", label: t("viewerRole") },
    ] as const,
    [t]
  );

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? null,
    [members, selectedMemberId]
  );

  const memberPermissionsDirty = useMemo(() => {
    if (!selectedMember) return false;
    return !listEquals(memberPermissions, selectedMember.permissions);
  }, [memberPermissions, selectedMember]);

  const canCustomizeSelectedMember =
    !!selectedMember &&
    selectedMember.role !== "admin" &&
    !selectedMember.is_bootstrap_admin;

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

  useEffect(() => {
    if (!selectedMemberId) return;
    if (!members.some((member) => member.id === selectedMemberId)) {
      setSelectedMemberId(null);
      setMemberPermissions([]);
    }
  }, [members, selectedMemberId]);

  function openMemberAccess(member: TeamMember) {
    setSelectedMemberId(member.id);
    setMemberPermissions([...member.permissions]);
  }

  function closeMemberAccess() {
    setSelectedMemberId(null);
    setMemberPermissions([]);
  }

  function toggleSelectedMemberPermission(permission: AppPermission) {
    if (!canCustomizeSelectedMember) return;
    setMemberPermissions((prev) => {
      const hasPermission = prev.includes(permission);
      const next = hasPermission
        ? prev.filter((entry) => entry !== permission)
        : [...prev, permission];
      return APP_PERMISSIONS.filter((entry) => next.includes(entry));
    });
  }

  async function saveSelectedMemberPermissions() {
    if (!selectedMember || !canCustomizeSelectedMember || savingMemberPermissions) {
      return;
    }

    setSavingMemberPermissions(true);
    try {
      const res = await fetch("/api/team/member-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedMember.id,
          permissions: memberPermissions,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? t("memberPermissionsUpdateFailed"));
      }

      const nextPermissions = (data?.member?.permissions ??
        memberPermissions) as AppPermission[];
      const nextIsCustomized = Boolean(data?.member?.is_customized);

      setMemberPermissions(nextPermissions);
      setMembers((prev) =>
        prev.map((member) =>
          member.id === selectedMember.id
            ? {
                ...member,
                permissions: nextPermissions,
                is_customized: nextIsCustomized,
              }
            : member
        )
      );

      toast.success(t("memberPermissionsUpdated"), {
        description: t("memberPermissionsUpdatedDescription", {
          email: selectedMember.email,
        }),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("memberPermissionsUpdateFailed");
      toast.error(message);
    } finally {
      setSavingMemberPermissions(false);
    }
  }

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
              <TableHead>{t("colAccess")}</TableHead>
              <TableHead>{t("colLastSignIn")}</TableHead>
              <TableHead>{t("colCreatedAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
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
                <TableCell colSpan={5} className="text-center py-8">
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
              members.map((member) => {
                const canCustomize = member.role !== "admin" && !member.is_bootstrap_admin;
                const isSelected = member.id === selectedMemberId;

                return (
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
                    <TableCell>
                      {canCustomize ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openMemberAccess(member)}
                            className="px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
                            style={{
                              fontFamily: "var(--font-mono)",
                              borderColor: "var(--border)",
                              color: "var(--muted-foreground)",
                              backgroundColor: isSelected ? "var(--input)" : "transparent",
                            }}
                          >
                            {isSelected ? t("editingAccess") : t("customizeAccess")}
                          </button>
                          <span
                            className="text-[9px] font-bold uppercase tracking-[0.15em]"
                            style={{
                              fontFamily: "var(--font-mono)",
                              color: "var(--muted-foreground)",
                            }}
                          >
                            {member.is_customized
                              ? t("customAccess")
                              : t("roleDefaultAccess")}
                          </span>
                        </div>
                      ) : (
                        <span
                          className="text-[9px] font-bold uppercase tracking-[0.15em]"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          {t("memberAccessFixed")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {formatDate(member.last_sign_in_at)}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {formatDate(member.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="pt-5 mt-5 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mb-3">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
            style={{ fontFamily: "var(--font-mono)", color: "var(--primary-text)" }}
          >
            {t("memberAccessTitle")}
          </p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {selectedMember
              ? t("memberAccessDescription", {
                  email: selectedMember.email,
                })
              : t("memberAccessSelectUser")}
          </p>
        </div>

        {!selectedMember ? null : !canCustomizeSelectedMember ? (
          <div
            className="border-2 p-4"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--input)" }}
          >
            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              {t("memberAccessFixedDescription")}
            </p>
          </div>
        ) : (
          <>
            <div className="border-2 overflow-auto" style={{ borderColor: "var(--border)" }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("permissionsColumnPermission")}</TableHead>
                    <TableHead className="text-center">{t("memberUserAccessColumn")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSION_DEFINITIONS.map((entry) => (
                    <TableRow key={`member-${entry.permission}`}>
                      <TableCell className="min-w-[260px]">
                        <p className="text-[11px] font-semibold">{t(entry.labelKey)}</p>
                        <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                          {t(entry.descriptionKey)}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <PermissionToggle
                          checked={memberPermissions.includes(entry.permission)}
                          disabled={savingMemberPermissions}
                          onChange={() => toggleSelectedMemberPermission(entry.permission)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-2 mt-3">
              <button
                type="button"
                onClick={closeMemberAccess}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
                style={{
                  fontFamily: "var(--font-mono)",
                  borderColor: "var(--border)",
                  color: "var(--muted-foreground)",
                  backgroundColor: "transparent",
                }}
              >
                {t("closeMemberAccess")}
              </button>

              <button
                type="button"
                onClick={saveSelectedMemberPermissions}
                disabled={!memberPermissionsDirty || savingMemberPermissions}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all disabled:opacity-40 disabled:pointer-events-none"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                {savingMemberPermissions
                  ? t("savingMemberPermissions")
                  : t("saveMemberPermissions")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
