/**
 * src/context/WorkspaceContext.tsx
 * Active workspace state, switcher data, and permission helpers.
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  workspaceApi,
  Workspace,
  WorkspaceRole,
  canManageMembers,
  canEditSettings,
  canDeleteWorkspace,
} from '../lib/workspace';
import { useAuth } from './AuthContext';

const ACTIVE_WORKSPACE_KEY = 'cf_active_workspace';

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  permissions: string[];
  loading: boolean;
  refreshWorkspaces: () => Promise<void>;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  selectWorkspaceById: (id: string) => void;
  createWorkspace: (input: { name: string; description?: string }) => Promise<Workspace>;
  canManageMembers: boolean;
  canEditSettings: boolean;
  canDeleteWorkspace: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const setActiveWorkspace = useCallback((workspace: Workspace | null) => {
    setActiveWorkspaceState(workspace);
    if (workspace) {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspace.id);
    } else {
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await workspaceApi.list();
      const list = data.data.workspaces;
      setWorkspaces(list);

      const savedId = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
      const saved = savedId ? list.find((w) => w.id === savedId) : null;
      const next = saved ?? list[0] ?? null;
      setActiveWorkspace(next);

      if (next) {
        const permRes = await workspaceApi.getPermissions(next.id);
        setPermissions(permRes.data.data.permissions);
      } else {
        setPermissions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, setActiveWorkspace]);

  useEffect(() => {
    void refreshWorkspaces();
  }, [refreshWorkspaces]);

  useEffect(() => {
    if (!activeWorkspace) {
      setPermissions([]);
      return;
    }
    void workspaceApi.getPermissions(activeWorkspace.id).then(({ data }) => {
      setPermissions(data.data.permissions);
    });
  }, [activeWorkspace?.id]);

  const selectWorkspaceById = useCallback(
    (id: string) => {
      const ws = workspaces.find((w) => w.id === id);
      if (ws) setActiveWorkspace(ws);
    },
    [workspaces, setActiveWorkspace],
  );

  const createWorkspace = useCallback(
    async (input: { name: string; description?: string }) => {
      const { data } = await workspaceApi.create(input);
      const workspace = data.data.workspace;
      await refreshWorkspaces();
      setActiveWorkspace(workspace);
      return workspace;
    },
    [refreshWorkspaces, setActiveWorkspace],
  );

  const role = activeWorkspace?.role;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        permissions,
        loading,
        refreshWorkspaces,
        setActiveWorkspace,
        selectWorkspaceById,
        createWorkspace,
        canManageMembers: role ? canManageMembers(role) : false,
        canEditSettings: role ? canEditSettings(role) : false,
        canDeleteWorkspace: role ? canDeleteWorkspace(role) : false,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspaceRole(): WorkspaceRole | null {
  return useWorkspace().activeWorkspace?.role ?? null;
}
