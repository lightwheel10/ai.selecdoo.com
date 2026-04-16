"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { AppPermission, AppRole } from "@/lib/auth/roles";

/**
 * Lightweight snapshot of the workspace's subscription passed from
 * the dashboard layout (server component) to the client tree. Just
 * enough to render the trial banner and gate non-sensitive UI; full
 * details live on /api/billing/status.
 */
export interface SubscriptionInfo {
  plan: string | null;
  status: string | null;
  trialEndsAt: string | null;
  intendedPlan: string | null;
}

interface AuthAccessContextValue {
  role: AppRole;
  permissions: AppPermission[];
  subscription: SubscriptionInfo | null;
}

const RoleContext = createContext<AuthAccessContextValue>({
  role: "viewer",
  permissions: [],
  subscription: null,
});

interface RoleProviderProps {
  role: AppRole;
  permissions: AppPermission[];
  subscription?: SubscriptionInfo | null;
  children: ReactNode;
}

export function RoleProvider({
  role,
  permissions,
  subscription = null,
  children,
}: RoleProviderProps) {
  return (
    <RoleContext.Provider value={{ role, permissions, subscription }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useCurrentRole(): AppRole {
  return useContext(RoleContext).role;
}

export function useCurrentPermissions(): AppPermission[] {
  return useContext(RoleContext).permissions;
}

export function useAuthAccess(): AuthAccessContextValue {
  return useContext(RoleContext);
}
