"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { AppPermission, AppRole } from "@/lib/auth/roles";

interface AuthAccessContextValue {
  role: AppRole;
  permissions: AppPermission[];
}

const RoleContext = createContext<AuthAccessContextValue>({
  role: "viewer",
  permissions: [],
});

interface RoleProviderProps {
  role: AppRole;
  permissions: AppPermission[];
  children: ReactNode;
}

export function RoleProvider({ role, permissions, children }: RoleProviderProps) {
  return (
    <RoleContext.Provider value={{ role, permissions }}>
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
