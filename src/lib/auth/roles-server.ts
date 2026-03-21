/**
 * Server-side role utilities.
 *
 * Multi-tenant: roles are resolved from workspace_members table
 * via getAuthContext() in session.ts. This file is kept for
 * backward compatibility but most functions have been removed.
 *
 * Role resolution flow: session.ts → workspace.ts →
 * getWorkspaceMembership() → workspace_members table.
 */

// This file intentionally exports nothing new.
// All role resolution is handled by workspace.ts.
// Kept as an empty module to prevent import errors if
// any file still references the path.
export {};
