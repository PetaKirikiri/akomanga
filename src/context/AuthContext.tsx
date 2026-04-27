import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import {
  DEV_DEFAULT_HR_CLIENT_ID,
  type DevPersona,
  isDevPersonaSwitcherEnabled,
  persistDevPersona,
  readStoredDevPersona,
} from '@/lib/devPersona';
import { supabase } from '@/lib/supabase';

export type AppUserRow = {
  id: number;
  email: string;
  display_name: string | null;
  role: string;
  client_id: number | null;
};

type AuthContextValue = {
  user: User | null;
  /** Session resolved and `app_users` + optional `students` row loaded when `user` is set. */
  loading: boolean;
  appUser: AppUserRow | null;
  studentId: number | null;
  /** Org id for `hr_admin`; null for other roles or unset. */
  clientId: number | null;
  /** Dev-only: UI persona overlay; in production builds always behaves as `live`. */
  devPersona: DevPersona;
  setDevPersona: (persona: DevPersona) => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function isStaffRole(role: string | undefined): boolean {
  return role === 'super_admin' || role === 'coordinator';
}

export function isHrAdminRole(role: string | undefined): boolean {
  return role === 'hr_admin';
}

function unwrapSnapshotPayload(data: unknown): unknown {
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return null;
    }
  }
  return data;
}

function coerceInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Parses JSON from portal_get_auth_snapshot (ids may be number or string from PostgREST). */
function parseAuthSnapshot(data: unknown): {
  appUser: AppUserRow;
  studentId: number | null;
  clientId: number | null;
} | null {
  const raw = unwrapSnapshotPayload(data);
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as {
    app_user?: {
      id?: unknown;
      email?: unknown;
      display_name?: unknown;
      role?: unknown;
      client_id?: unknown;
    };
    student_id?: unknown;
  };
  const u = o.app_user;
  if (!u || typeof u !== 'object') return null;
  const id = coerceInt(u.id);
  if (id == null) return null;
  const sid = coerceInt(o.student_id);
  const cid = coerceInt(u.client_id);
  return {
    appUser: {
      id,
      email: String(u.email ?? ''),
      display_name: u.display_name == null || u.display_name === undefined ? null : String(u.display_name),
      role: String(u.role ?? ''),
      client_id: cid,
    },
    studentId: sid,
    clientId: cid,
  };
}

function isMissingSnapshotRpc(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === '42883' || err.code === 'PGRST202') return true;
  const m = String(err.message ?? '').toLowerCase();
  return m.includes('portal_get_auth_snapshot') || m.includes('does not exist') || m.includes('schema cache');
}

function noopDevPersona(_p: DevPersona) {}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const devSwitcherOn = isDevPersonaSwitcherEnabled();
  const [user, setUser] = useState<User | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [appUser, setAppUser] = useState<AppUserRow | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [devPersona, setDevPersonaState] = useState<DevPersona>(() =>
    devSwitcherOn ? readStoredDevPersona() : 'live',
  );

  const setDevPersona = useCallback(
    (persona: DevPersona) => {
      if (!isDevPersonaSwitcherEnabled()) return;
      setDevPersonaState(persona);
      persistDevPersona(persona);
      void queryClient.invalidateQueries({ queryKey: ['portal'] });
    },
    [queryClient],
  );

  const effectiveProfile = useMemo(() => {
    if (!devSwitcherOn || devPersona === 'live' || appUser == null) {
      return { appUser, studentId, clientId };
    }
    const u = appUser;
    switch (devPersona) {
      case 'learner':
        return {
          appUser: { ...u, role: 'user', client_id: null },
          studentId,
          clientId: null,
        };
      case 'hr_admin':
        return {
          appUser: { ...u, role: 'hr_admin', client_id: DEV_DEFAULT_HR_CLIENT_ID },
          studentId,
          clientId: DEV_DEFAULT_HR_CLIENT_ID,
        };
      case 'staff':
        return {
          appUser: { ...u, role: 'coordinator', client_id: null },
          studentId,
          clientId: null,
        };
      case 'admin':
        return {
          appUser: { ...u, role: 'super_admin', client_id: null },
          studentId,
          clientId: null,
        };
      default:
        return { appUser, studentId, clientId };
    }
  }, [devSwitcherOn, devPersona, appUser, studentId, clientId]);

  const loadProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setAppUser(null);
      setStudentId(null);
      setClientId(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      await supabase.rpc('claim_app_user_by_email');
      await supabase.rpc('portal_ensure_app_user_for_auth');

      const snap = await supabase.rpc('portal_get_auth_snapshot');
      const parsed = !snap.error ? parseAuthSnapshot(snap.data) : null;

      if (!snap.error && parsed) {
        setAppUser(parsed.appUser);
        setStudentId(parsed.studentId);
        setClientId(parsed.clientId);
        return;
      }

      if (snap.error && !isMissingSnapshotRpc(snap.error)) {
        setAppUser(null);
        setStudentId(null);
        setClientId(null);
        return;
      }

      const fetchAppUser = () =>
        supabase
          .from('app_users')
          .select('id, email, display_name, role, client_id')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();

      let { data: au, error: auErr } = await fetchAppUser();

      if (auErr || !au) {
        ({ data: au, error: auErr } = await fetchAppUser());
      }

      if (auErr || !au) {
        setAppUser(null);
        setStudentId(null);
        setClientId(null);
        return;
      }
      const auClientId = coerceInt((au as { client_id?: unknown }).client_id);
      setAppUser({
        id: au.id as number,
        email: au.email as string,
        display_name: (au.display_name as string | null) ?? null,
        role: au.role as string,
        client_id: auClientId,
      });
      setClientId(auClientId);
      const { data: st } = await supabase
        .from('students')
        .select('id')
        .eq('app_user_id', au.id)
        .maybeSingle();
      setStudentId(st?.id != null ? (st.id as number) : null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await loadProfile(session?.user ?? null);
  }, [loadProfile]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        return loadProfile(session?.user ?? null);
      })
      .catch(() => {
        setUser(null);
        void loadProfile(null);
      })
      .finally(() => setSessionReady(true));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void loadProfile(session?.user ?? null);
      void queryClient.invalidateQueries({ queryKey: ['portal'] });
    });
    return () => subscription.unsubscribe();
  }, [loadProfile, queryClient]);

  const loading = !sessionReady || (user !== null && profileLoading);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAppUser(null);
    setStudentId(null);
    setClientId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        appUser: effectiveProfile.appUser,
        studentId: effectiveProfile.studentId,
        clientId: effectiveProfile.clientId,
        devPersona: devSwitcherOn ? devPersona : 'live',
        setDevPersona: devSwitcherOn ? setDevPersona : noopDevPersona,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
