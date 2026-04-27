import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PortalCard } from '@/components/portal/PortalLayout';
import { supabase } from '@/lib/supabase';
import { HrPageShell, hrInputClass } from '@/pages/hr/HrPageShell';

type StudentRow = { id: number; name: string; email: string | null };

function parseInvokeError(data: unknown, fallback: string): string {
  if (data != null && typeof data === 'object' && 'error' in data) {
    const e = (data as { error: unknown }).error;
    if (typeof e === 'string' && e !== '') return e;
  }
  return fallback;
}

export default function HrStudentsPage() {
  const { clientId } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const studentsQuery = useQuery({
    queryKey: ['portal', 'hr-students', clientId],
    enabled: clientId != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, email')
        .eq('client_id', clientId as number)
        .order('name');
      if (error) throw error;
      return (data ?? []) as StudentRow[];
    },
  });

  const inviteStudent = useMutation({
    mutationFn: async () => {
      if (clientId == null) throw new Error('No organisation.');
      const n = name.trim();
      const em = email.trim().toLowerCase();
      if (!n) throw new Error('Name is required.');
      if (!em) throw new Error('Email is required to send an invite.');
      const { data, error } = await supabase.functions.invoke('hr-invite-learner', {
        body: { name: n, email: em },
      });
      if (error) {
        throw new Error(error.message || 'Invite failed');
      }
      if (data != null && typeof data === 'object' && 'error' in data) {
        throw new Error(parseInvokeError(data, 'Invite failed'));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['portal', 'hr-students'] });
      setInviteMessage('Invite sent. They should check email to finish signing up.');
      setName('');
      setEmail('');
    },
    onError: () => {
      setInviteMessage(null);
    },
  });

  const addStudent = useMutation({
    mutationFn: async () => {
      if (clientId == null) throw new Error('No organisation.');
      const n = name.trim();
      if (!n) throw new Error('Name is required.');
      const em = email.trim();
      const { error } = await supabase.from('students').insert({
        name: n,
        email: em || null,
        client_id: clientId,
        app_user_id: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['portal', 'hr-students'] });
      setInviteMessage(null);
      setName('');
      setEmail('');
    },
  });

  return (
    <HrPageShell>
      <PortalCard className="p-5">
        <h2 className="text-sm font-semibold text-portal-ink">Add a learner</h2>
        <p className="mt-1 text-sm text-portal-muted">
          Send an email invite so they can sign in and join your roster, or add them to the roster only
          (no login yet).
        </p>
        <label className="mt-4 block text-sm text-portal-ink">
          <span className="text-portal-muted">Name</span>
          <input className={hrInputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="mt-3 block text-sm text-portal-ink">
          <span className="text-portal-muted">Email</span>
          <input className={hrInputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={inviteStudent.isPending || addStudent.isPending}
            onClick={() => {
              setInviteMessage(null);
              void inviteStudent.mutateAsync().catch(() => {});
            }}
            className="rounded-lg bg-portal-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-portal-accent-muted disabled:opacity-50"
          >
            {inviteStudent.isPending ? 'Sending…' : 'Send email invite'}
          </button>
          <button
            type="button"
            disabled={addStudent.isPending || inviteStudent.isPending}
            onClick={() => {
              setInviteMessage(null);
              void addStudent.mutateAsync().catch(() => {});
            }}
            className="rounded-lg border border-portal-border bg-portal-surface px-4 py-2 text-sm font-medium text-portal-ink shadow-sm hover:bg-portal-bg disabled:opacity-50"
          >
            {addStudent.isPending ? 'Saving…' : 'Add to roster only'}
          </button>
        </div>
        {inviteMessage ? <p className="mt-2 text-sm text-portal-muted">{inviteMessage}</p> : null}
        {inviteStudent.isError ? (
          <p className="mt-2 text-sm text-portal-danger">{(inviteStudent.error as Error).message}</p>
        ) : null}
        {addStudent.isError ? (
          <p className="mt-2 text-sm text-portal-danger">{(addStudent.error as Error).message}</p>
        ) : null}
      </PortalCard>

      <PortalCard className="p-5">
        <h2 className="text-sm font-semibold text-portal-ink">Roster</h2>
        {studentsQuery.isPending ? (
          <p className="mt-2 text-sm text-portal-muted">Loading…</p>
        ) : studentsQuery.isError ? (
          <p className="mt-2 text-sm text-portal-danger">{(studentsQuery.error as Error).message}</p>
        ) : (studentsQuery.data?.length ?? 0) === 0 ? (
          <p className="mt-2 text-sm text-portal-muted">No students yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-portal-border text-sm text-portal-ink">
            {studentsQuery.data?.map((s) => (
              <li key={s.id} className="py-2">
                <span className="font-medium">{s.name}</span>
                {s.email ? <span className="text-portal-muted"> · {s.email}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </PortalCard>
    </HrPageShell>
  );
}
