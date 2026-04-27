import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PortalCard } from '@/components/portal/PortalLayout';
import { supabase } from '@/lib/supabase';
import { HrPageShell } from '@/pages/hr/HrPageShell';

type ProgressRow = {
  student_id: number;
  course_id: number;
  lesson_number: number;
  completed_at: string | null;
};

export default function HrProgressPage() {
  const { clientId } = useAuth();

  const progressQuery = useQuery({
    queryKey: ['portal', 'hr-progress', clientId],
    enabled: clientId != null,
    queryFn: async () => {
      const cid = clientId as number;
      const { data: studs, error: e1 } = await supabase
        .from('students')
        .select('id, name')
        .eq('client_id', cid);
      if (e1) throw e1;
      const list = (studs ?? []) as { id: number; name: string }[];
      if (list.length === 0) return { students: list, progress: [] as ProgressRow[] };
      const ids = list.map((s) => s.id);
      const { data: prog, error: e2 } = await supabase
        .from('student_lesson_progress')
        .select('student_id, course_id, lesson_number, completed_at')
        .in('student_id', ids)
        .order('course_id')
        .order('lesson_number');
      if (e2) throw e2;
      return { students: list, progress: (prog ?? []) as ProgressRow[] };
    },
  });

  const nameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of progressQuery.data?.students ?? []) {
      m.set(s.id, s.name);
    }
    return m;
  }, [progressQuery.data?.students]);

  return (
    <HrPageShell>
      <PortalCard className="p-5">
        <h2 className="text-sm font-semibold text-portal-ink">Lesson progress</h2>
        <p className="mt-1 text-sm text-portal-muted">Completion rows your organisation&apos;s learners have recorded.</p>
        {progressQuery.isPending ? (
          <p className="mt-4 text-sm text-portal-muted">Loading…</p>
        ) : progressQuery.isError ? (
          <p className="mt-4 text-sm text-portal-danger">{(progressQuery.error as Error).message}</p>
        ) : (progressQuery.data?.progress.length ?? 0) === 0 ? (
          <p className="mt-4 text-sm text-portal-muted">No progress rows yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm text-portal-ink">
              <thead>
                <tr className="border-b border-portal-border text-portal-muted">
                  <th className="py-2 pr-3 font-medium">Learner</th>
                  <th className="py-2 pr-3 font-medium">Course</th>
                  <th className="py-2 pr-3 font-medium">Lesson</th>
                  <th className="py-2 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {progressQuery.data?.progress.map((r) => (
                  <tr key={`${r.student_id}-${r.course_id}-${r.lesson_number}`} className="border-b border-portal-border/60">
                    <td className="py-2 pr-3">{nameById.get(r.student_id) ?? r.student_id}</td>
                    <td className="py-2 pr-3">{r.course_id}</td>
                    <td className="py-2 pr-3">{r.lesson_number}</td>
                    <td className="py-2 text-portal-muted">
                      {r.completed_at ? new Date(r.completed_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PortalCard>
    </HrPageShell>
  );
}
