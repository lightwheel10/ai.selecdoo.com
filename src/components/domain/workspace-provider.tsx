/**
 * Workspace context provider for client components.
 *
 * Provides the current workspace ID and name to any client component
 * that needs it. The workspace is resolved server-side by getAuthContext()
 * in the dashboard layout and passed down via this provider.
 *
 * API calls from client components do NOT need to explicitly pass the
 * workspace ID — the server resolves it from the user's session via
 * getAuthContext()'s auto-resolve logic.
 */

"use client";

import { createContext, useContext, type ReactNode } from "react";

interface WorkspaceContextValue {
  workspaceId: string | null;
  workspaceName: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaceId: null,
  workspaceName: null,
});

interface WorkspaceProviderProps {
  workspaceId: string | null;
  workspaceName: string | null;
  children: ReactNode;
}

export function WorkspaceProvider({
  workspaceId,
  workspaceName,
  children,
}: WorkspaceProviderProps) {
  return (
    <WorkspaceContext.Provider value={{ workspaceId, workspaceName }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  return useContext(WorkspaceContext);
}
