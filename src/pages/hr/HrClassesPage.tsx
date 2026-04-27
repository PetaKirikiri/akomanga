import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PortalCard } from '@/components/portal/PortalLayout';
import { supabase } from '@/lib/supabase';
import { HrPageShell, hrInputClass } from '@/pages/hr/HrPageShell';

type CourseRow = { id: number; name: string };
type ClassRow = { id: number; label: string | null; course_id: number | null };
type StudentRow = { id: number; name: string };

export default function HrClassesPage() {
  const { clientId } = useAuth();
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState<number | ''>('');
  const [label, setLabel] = useState('');
  const [enrollClassId, setEnrollClassId] = useState<number | ''>('');
  const [enrollStudentId, setEnrollStudentId] = useState<number | ''>('');

  const coursesQuery = useQuery({
    queryKey: ['portal', 'hr-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('id, name').order('id');
      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
  });

  const classesQuery = useQuery({
    queryKey: ['portal', 'hr-classes', clientId],
    enabled: clientId != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, label, course_id')
        .eq('client_id', clientId as number)
        .order('id', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClassRow[];
    },
  });

  const studentsQuery = useQuery({
    queryKey: ['portal', 'hr-students', clientId],
    enabled: clientId != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name')
        .eq('client_id', clientId as number)
        .order('name');
      if (error) throw error;
      return (data ?? []) as StudentRow[];
    },
  });

  const createClass = useMutation({
    mutationFn: async () => {
      if (clientId == null || courseId === '') throw new Error('Choose a course.');
      const { error } = await supabase.from('classes').insert({
        client_id: clientId,
        course_id: courseId as number,
        label: label.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['portal', 'hr-classes'] });
      setLabel('');
    },
  });

  const enroll = useMutation({
    mutationFn: async () => {
      if (enrollClassId === '' || enrollStudentId === '') throw new Error('Choose class and student.');
      const { error } = await supabase.from('class_enrollments').insert({
        class_id: enrollClassId as number,
        student_id: enrollStudentId as number,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['portal'] });
    },
  });

  return (
    <HrPageShell>
      <PortalCard className="p-5">
        <h2 className="text-sm font-semibold text-portal-ink">Book a class</h2>
        <p className="mt-1 text-sm text-portal-muted">Creates a class row for your organisation and selected course.</p>
        <label className="mt-4 block text-sm text-portal-ink">
          <span className="text-portal-muted">Course</span>
          <select
            className={hrInputClass}
            value={courseId === '' ? '' : String(courseId)}
            onChange={(e) => setCourseId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Select…</option>
            {(coursesQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm text-portal-ink">
          <span className="text-portal-muted">Label (optional)</span>
          <input className={hrInputClass} value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <button
          type="button"
          disabled={createClass.isPending || courseId === ''}
          onClick={() => void createClass.mutateAsync().catch(() => {})}
          className="mt-4 rounded-lg bg-portal-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-portal-accent-muted disabled:opacity-50"
        >
          {createClass.isPending ? 'Saving…' : 'Create class'}
        </button>
        {createClass.isError ? (
          <p className="mt-2 text-sm text-portal-danger">{(createClass.error as Error).message}</p>
        ) : null}
      </PortalCard>

      <PortalCard className="p-5">
        <h2 className="text-sm font-semibold text-portal-ink">Enrol a learner</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-portal-ink">
            <span className="text-portal-muted">Class</span>
            <select
              className={hrInputClass}
              value={enrollClassId === '' ? '' : String(enrollClassId)}
              onChange={(e) => setEnrollClassId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select…</option>
              {(classesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label ?? `Class #${c.id}`} (course {c.course_id ?? '—'})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-portal-ink">
            <span className="text-portal-muted">Student</span>
            <select
              className={hrInputClass}
              value={enrollStudentId === '' ? '' : String(enrollStudentId)}
              onChange={(e) => setEnrollStudentId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select…</option>
              {(studentsQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={enroll.isPending || enrollClassId === '' || enrollStudentId === ''}
          onClick={() => void enroll.mutateAsync().catch(() => {})}
          className="mt-4 rounded-lg border border-portal-border bg-portal-surface px-4 py-2 text-sm font-medium text-portal-ink shadow-sm hover:bg-portal-bg disabled:opacity-50"
        >
          {enroll.isPending ? 'Enrolling…' : 'Add enrolment'}
        </button>
        {enroll.isError ? <p className="mt-2 text-sm text-portal-danger">{(enroll.error as Error).message}</p> : null}
      </PortalCard>

      <PortalCard className="p-5">
        <h2 className="text-sm font-semibold text-portal-ink">Your classes</h2>
        {classesQuery.isPending ? (
          <p className="mt-2 text-sm text-portal-muted">Loading…</p>
        ) : classesQuery.isError ? (
          <p className="mt-2 text-sm text-portal-danger">{(classesQuery.error as Error).message}</p>
        ) : (classesQuery.data?.length ?? 0) === 0 ? (
          <p className="mt-2 text-sm text-portal-muted">No classes yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-portal-ink">
            {classesQuery.data?.map((c) => (
              <li key={c.id} className="rounded-lg border border-portal-border bg-portal-bg/40 px-3 py-2">
                <span className="font-medium">{c.label ?? `Class #${c.id}`}</span>
                <span className="text-portal-muted"> · course {c.course_id ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </PortalCard>
    </HrPageShell>
  );
}
