import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { isHrAdminRole, isStaffRole, useAuth } from '@/context/AuthContext';
import { TokenWord } from '@/components/tokens/TokenWord';
import {
  PortalAccountFooter,
  PortalCard,
  PortalHeaderProfile,
  PortalShell,
  PortalSidebar,
  portalNavForRole,
} from '@/components/portal/PortalLayout';
import { isValidTokenColor } from '@/lib/tokenStyling';
import { logEcosystemLinkClick } from '@/lib/ecosystemNavigationDebug';
import { mataClassroomUrl, maumaharaUrl } from '@/lib/mataLaunch';
import { supabase } from '@/lib/supabase';

type WordRegistryRow = {
  word_text: string;
  language: string;
  frequency_rank: number | null;
  metadata: Record<string, unknown> | null;
  pos_types: unknown;
};

type CourseWordGroup = {
  courseId: number;
  courseName: string;
  wordTexts: string[];
};

type StudentClassNote = {
  id: number;
  label: string;
  organizationName: string;
  teacherName: string;
  coordinatorName: string;
  courseName: string;
  courseDescription: string | null;
  meetingStart: string | null;
  meetingEnd: string | null;
  nextSessionDate: string | null;
  nextSessionNumber: number | null;
  sessions: { sessionDate: string; sessionNumber: number }[];
};

type ClassEnrollmentWithClass = {
  class_id: number;
  classes:
    | {
        id: number;
        label: string | null;
        client_id: number | null;
        course_id: number | null;
        meeting_start: string | null;
        meeting_end: string | null;
        clients: { name: string } | { name: string }[] | null;
        teacher: { display_name: string | null; email: string } | { display_name: string | null; email: string }[] | null;
        coordinator: { display_name: string | null; email: string } | { display_name: string | null; email: string }[] | null;
        courses: { name: string; description: string | null } | { name: string; description: string | null }[] | null;
        class_sessions:
          | { session_date: string; session_number: number }[]
          | null;
      }
    | {
        id: number;
        label: string | null;
        client_id: number | null;
        course_id: number | null;
        meeting_start: string | null;
        meeting_end: string | null;
        clients: { name: string } | { name: string }[] | null;
        teacher: { display_name: string | null; email: string } | { display_name: string | null; email: string }[] | null;
        coordinator: { display_name: string | null; email: string } | { display_name: string | null; email: string }[] | null;
        courses: { name: string; description: string | null } | { name: string; description: string | null }[] | null;
        class_sessions:
          | { session_date: string; session_number: number }[]
          | null;
      }[]
    | null;
};

function normalizeStudentClassNotes(rows: ClassEnrollmentWithClass[]): StudentClassNote[] {
  return rows.map((row, index) => {
    const classRow = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    const clientRow = Array.isArray(classRow?.clients) ? classRow?.clients[0] : classRow?.clients;
    const teacherRow = Array.isArray(classRow?.teacher) ? classRow?.teacher[0] : classRow?.teacher;
    const coordinatorRow = Array.isArray(classRow?.coordinator) ? classRow?.coordinator[0] : classRow?.coordinator;
    const courseRow = Array.isArray(classRow?.courses) ? classRow?.courses[0] : classRow?.courses;
    const upcomingSessions = (classRow?.class_sessions ?? [])
      .filter((session) => session.session_date >= new Date().toISOString().slice(0, 10))
      .sort((a, b) => a.session_date.localeCompare(b.session_date));
    const sessions = (classRow?.class_sessions ?? [])
      .map((session) => ({ sessionDate: session.session_date, sessionNumber: session.session_number }))
      .sort((a, b) => a.sessionNumber - b.sessionNumber);
    const nextSession = upcomingSessions[0] ?? null;
    return {
      id: classRow?.id ?? row.class_id,
      label: classRow?.label?.trim() || `Class ${index + 1}`,
      organizationName: clientRow?.name ?? 'Organization TBC',
      teacherName: teacherRow?.display_name ?? teacherRow?.email ?? 'Teacher TBC',
      coordinatorName: coordinatorRow?.display_name ?? coordinatorRow?.email ?? 'Coordinator TBC',
      courseName: courseRow?.name ?? `Course ${classRow?.course_id ?? ''}`.trim(),
      courseDescription: courseRow?.description ?? null,
      meetingStart: classRow?.meeting_start ?? null,
      meetingEnd: classRow?.meeting_end ?? null,
      nextSessionDate: nextSession?.session_date ?? null,
      nextSessionNumber: nextSession?.session_number ?? null,
      sessions,
    };
  });
}

function registryFallback(wordText: string): WordRegistryRow {
  return {
    word_text: wordText,
    language: 'mi',
    frequency_rank: null,
    metadata: null,
    pos_types: [],
  };
}

async function fetchCourseWordGroups(): Promise<CourseWordGroup[]> {
  const { data, error } = await supabase.from('course_words').select('course_id, word_text, courses(name)');
  if (error) throw error;
  const byCourse = new Map<number, Set<string>>();
  const courseNameById = new Map<number, string>();
  for (const row of data ?? []) {
    const cid = row.course_id as number;
    const wt = row.word_text as string;
    const rel = row.courses as { name: string } | { name: string }[] | null;
    const name = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    if (!byCourse.has(cid)) byCourse.set(cid, new Set());
    byCourse.get(cid)!.add(wt);
    if (name) courseNameById.set(cid, name);
  }
  const groups: CourseWordGroup[] = [...byCourse.entries()].map(([courseId, set]) => ({
    courseId,
    courseName: courseNameById.get(courseId) ?? `Course ${courseId}`,
    wordTexts: [...set].sort((a, b) => a.localeCompare(b)),
  }));
  groups.sort((a, b) => a.courseName.localeCompare(b.courseName));
  return groups;
}

function readPronunciationUrl(metadata: unknown): string | null {
  if (metadata == null || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const v = (metadata as Record<string, unknown>).pronunciation_url;
  return typeof v === 'string' && /^https?:\/\//.test(v) ? v : null;
}

function readPosCodes(posTypes: unknown): string[] {
  if (!Array.isArray(posTypes)) return [];
  const out: string[] = [];
  for (const x of posTypes) {
    if (x != null && typeof x === 'object' && 'code' in x) {
      const c = (x as { code: unknown }).code;
      if (typeof c === 'string' && c.length > 0) out.push(c);
    }
  }
  return out;
}

function primaryPosGroupLabel(
  w: WordRegistryRow,
  posById: Map<number, { code?: string | null }>,
): string {
  const codes = readPosCodes(w.pos_types);
  if (codes.length > 0) return codes[0]!;
  const raw = w.pos_types;
  if (!Array.isArray(raw)) return 'Unspecified';
  for (const x of raw) {
    if (x == null || typeof x !== 'object' || !('pos_type_id' in x)) continue;
    const id = Number((x as { pos_type_id: unknown }).pos_type_id);
    if (!Number.isFinite(id)) continue;
    const code = posById.get(id)?.code;
    if (typeof code === 'string' && code.length > 0) return code;
  }
  return 'Unspecified';
}

function groupWordTextsByPrimaryPos(
  wordTexts: string[],
  registryByText: Map<string, WordRegistryRow>,
  posById: Map<number, { code?: string | null }>,
): { label: string; sortKey: string; texts: string[] }[] {
  const bucket = new Map<string, string[]>();
  const labelByKey = new Map<string, string>();
  for (const t of wordTexts) {
    const w = registryByText.get(t) ?? registryFallback(t);
    const label = primaryPosGroupLabel(w, posById);
    const sortKey = label === 'Unspecified' ? '__unspecified' : label;
    if (!bucket.has(sortKey)) {
      bucket.set(sortKey, []);
      labelByKey.set(sortKey, label);
    }
    bucket.get(sortKey)!.push(t);
  }
  const keys = [...bucket.keys()].sort((a, b) => {
    if (a === '__unspecified') return 1;
    if (b === '__unspecified') return -1;
    return a.localeCompare(b);
  });
  return keys.map((sortKey) => ({
    sortKey,
    label: labelByKey.get(sortKey) ?? sortKey,
    texts: (bucket.get(sortKey) ?? []).sort((a, b) => a.localeCompare(b)),
  }));
}

function resolveRegistryUnderlineColor(
  w: WordRegistryRow,
  posById: Map<number, { color?: string | null; code?: string | null }>,
): string | undefined {
  const raw = w.pos_types;
  if (!Array.isArray(raw)) return undefined;
  for (const x of raw) {
    if (x == null || typeof x !== 'object' || !('pos_type_id' in x)) continue;
    const id = Number((x as { pos_type_id: unknown }).pos_type_id);
    if (!Number.isFinite(id)) continue;
    const col = posById.get(id)?.color;
    if (isValidTokenColor(col)) return col!;
  }
  return undefined;
}

function normalizeMetaKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, '_');
}

function isPronunciationMetaKey(k: string): boolean {
  return normalizeMetaKey(k) === 'pronunciation_url';
}

function isTeAkaPayloadKey(k: string): boolean {
  return normalizeMetaKey(k) === 'te_aka';
}

function isTeAkaWordIdMetaKey(k: string): boolean {
  const n = normalizeMetaKey(k);
  if (n === 'te_aka_word_id') return true;
  return n.includes('te') && n.includes('aka') && n.includes('word') && n.includes('id');
}

type TeAkaDictEntry = { pos?: string; example?: string; definition?: string };

type TeAkaPayload = {
  word?: string;
  wordId?: number | null;
  entries?: TeAkaDictEntry[];
  sourceUrl?: string;
  fetchedAt?: string;
};

function tryParseTeAkaPayload(raw: unknown): TeAkaPayload | null {
  let o: unknown = raw;
  if (typeof raw === 'string') {
    try {
      o = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (o == null || typeof o !== 'object' || Array.isArray(o)) return null;
  const p = o as Record<string, unknown>;
  if (!Array.isArray(p.entries)) return null;
  return {
    word: typeof p.word === 'string' ? p.word : undefined,
    wordId: typeof p.wordId === 'number' ? p.wordId : p.wordId === null ? null : undefined,
    entries: p.entries as TeAkaDictEntry[],
    sourceUrl: typeof p.sourceUrl === 'string' ? p.sourceUrl : undefined,
    fetchedAt: typeof p.fetchedAt === 'string' ? p.fetchedAt : undefined,
  };
}

function findTeAkaPayload(metadata: Record<string, unknown> | null): TeAkaPayload | null {
  if (metadata == null) return null;
  for (const [k, v] of Object.entries(metadata)) {
    if (!isTeAkaPayloadKey(k)) continue;
    const payload = tryParseTeAkaPayload(v);
    if (payload?.entries && payload.entries.length > 0) return payload;
  }
  return null;
}

function findTeAkaWordId(metadata: Record<string, unknown> | null): string | number | null {
  if (metadata == null) return null;
  for (const [k, v] of Object.entries(metadata)) {
    if (!isTeAkaWordIdMetaKey(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return null;
}

function metadataEntriesRemaining(
  metadata: Record<string, unknown> | null,
): { id: string; label: string; value: string }[] {
  if (metadata == null || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const rows: { id: string; label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(metadata)) {
    if (v == null) continue;
    if (isPronunciationMetaKey(k) || isTeAkaPayloadKey(k) || isTeAkaWordIdMetaKey(k)) continue;
    const value = typeof v === 'string' ? v : JSON.stringify(v);
    rows.push({ id: k, label: k.replace(/_/g, ' '), value });
  }
  return rows.sort((a, b) => a.label.localeCompare(b.label));
}

function TeAkaEntriesList({ payload }: { payload: TeAkaPayload }) {
  return (
    <ul className="mt-2 list-none space-y-4 p-0">
      {(payload.entries ?? []).map((e, i) => (
        <li key={i} className="border-l-2 border-portal-accent/50 pl-3">
          {e.pos ? <p className="text-xs font-semibold uppercase tracking-wide text-portal-muted">{e.pos}</p> : null}
          {e.definition ? <p className="mt-1 text-sm leading-snug text-portal-ink">{e.definition}</p> : null}
          {e.example ? (
            <p className="mt-2 text-xs leading-relaxed text-portal-muted italic">&ldquo;{e.example}&rdquo;</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function slugForDom(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function VocabWordListItem({
  w,
  rowKey,
  posById,
}: {
  w: WordRegistryRow;
  rowKey: string;
  posById: Map<number, { color?: string | null; code?: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const audio = readPronunciationUrl(w.metadata);
  const posCodes = readPosCodes(w.pos_types);
  const underlineColor = resolveRegistryUnderlineColor(w, posById);
  const teAkaPayload = findTeAkaPayload(w.metadata);
  const teAkaWordId = findTeAkaWordId(w.metadata);
  const otherMetaRows = metadataEntriesRemaining(w.metadata);
  const hasExpandHint =
    posCodes.length > 0 || teAkaPayload != null || teAkaWordId != null || otherMetaRows.length > 0;
  const sid = slugForDom(rowKey);

  return (
    <li>
      <div className="flex gap-1">
        <button
          type="button"
          className="min-w-0 flex-1 px-4 py-3 text-left hover:bg-portal-bg/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-ring/25"
          aria-expanded={open}
          aria-controls={`vocab-detail-${sid}`}
          id={`vocab-trigger-${sid}`}
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-portal-muted" aria-hidden>
              {open ? '▼' : '▶'}
            </span>
            <TokenWord
              text={w.word_text}
              underlineColor={underlineColor}
              className="text-base font-medium text-portal-ink"
            />
            {w.frequency_rank != null ? (
              <span className="text-xs tabular-nums text-portal-muted">· rank {w.frequency_rank}</span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-portal-muted">
            {hasExpandHint ? 'Dictionary details — tap to expand' : 'Tap to expand'}
          </p>
        </button>
        <div className="flex shrink-0 items-center pr-3">
          {audio ? <VocabSpeakerButton url={audio} wordLabel={w.word_text} /> : null}
        </div>
      </div>
      {open ? (
        <div
          id={`vocab-detail-${sid}`}
          role="region"
          aria-labelledby={`vocab-trigger-${sid}`}
          className="border-t border-portal-border bg-portal-bg/50 px-4 py-3 text-sm text-portal-ink"
        >
          {teAkaWordId != null ? (
            <p className="text-xs text-portal-muted">
              <span className="font-medium text-portal-ink">Te Aka dictionary ID</span>
              <span className="tabular-nums"> · {String(teAkaWordId)}</span>
            </p>
          ) : null}
          {teAkaPayload ? <TeAkaEntriesList payload={teAkaPayload} /> : null}
          {posCodes.length > 0 ? (
            <p className={`text-xs text-portal-muted ${teAkaPayload || teAkaWordId != null ? 'mt-4' : ''}`}>
              <span className="font-medium text-portal-ink/80">POS: </span>
              {posCodes.join(', ')}
            </p>
          ) : null}
          {w.language && w.language !== 'mi' ? (
            <p className="mt-2 text-xs text-portal-muted">
              <span className="font-medium text-portal-ink/80">Language: </span>
              {w.language}
            </p>
          ) : null}
          {otherMetaRows.length > 0 ? (
            <dl className="mt-4 space-y-2 border-t border-portal-border pt-3">
              {otherMetaRows.map(({ id: metaId, label, value }) => (
                <div key={metaId}>
                  <dt className="text-xs font-medium capitalize text-portal-muted">{label}</dt>
                  <dd className="mt-0.5 break-all text-xs text-portal-ink">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {!teAkaPayload && teAkaWordId == null && posCodes.length === 0 && otherMetaRows.length === 0 ? (
            <p className="text-xs text-portal-muted">No dictionary entries stored for this word yet.</p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function VocabSpeakerButton({ url, wordLabel }: { url: string; wordLabel: string }) {
  return (
    <button
      type="button"
      className="shrink-0 rounded-lg border border-portal-border bg-portal-surface p-2 text-portal-ink shadow-sm hover:bg-portal-bg focus:outline-none focus:ring-2 focus:ring-portal-ring/25"
      aria-label={`Play pronunciation for ${wordLabel}`}
      onClick={() => {
        const a = new Audio(url);
        void a.play().catch(() => {});
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden
      >
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.564-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.064 2.131 2.631 2.292h1.865l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 2.75 2.75 0 000-11.668.75.75 0 010-1.06z" />
        <path d="M15.932 7.757a.75.75 0 011.061 0 2.25 2.25 0 010 3.182.75.75 0 11-1.06-1.061.75.75 0 000-1.06.75.75 0 010-1.06z" />
      </svg>
    </button>
  );
}

function formatSessionDate(date: string | null): string {
  if (!date) return 'No upcoming session';
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatSessionTime(start: string | null, end: string | null): string {
  if (!start || !end) return 'TBC';
  return `${start.slice(0, 5)}-${end.slice(0, 5)}`;
}

function StudentClassNotesNavigator({
  classes,
  isPending,
  isError,
  errorMessage,
}: {
  classes: StudentClassNote[];
  isPending: boolean;
  isError: boolean;
  errorMessage: string | null;
}) {
  return (
    <div className="h-full">
      {isPending ? (
        <p className="mt-6 text-sm text-portal-muted">Loading classes...</p>
      ) : isError ? (
        <p className="mt-6 text-sm text-portal-danger">{errorMessage}</p>
      ) : classes.length === 0 ? (
        <p className="mt-6 text-sm text-portal-muted">No classes are linked to this student yet.</p>
      ) : (
        <ol>
          {classes.map((classItem) => (
            <li
              key={classItem.id}
              className="min-h-full bg-portal-surface p-4 sm:p-6"
            >
              <div className="min-w-0">
                <dl className="grid gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-portal-muted">Organization</dt>
                    <dd className="text-portal-ink">{classItem.organizationName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-portal-muted">Teacher</dt>
                    <dd className="text-portal-ink">{classItem.teacherName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-portal-muted">Coordinator</dt>
                    <dd className="text-portal-ink">{classItem.coordinatorName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-portal-muted">Level</dt>
                    <dd className="text-portal-ink">{classItem.courseName}</dd>
                  </div>
                </dl>
              </div>
              {classItem.sessions.length > 0 ? (
                <div className="mt-4 border-t border-portal-border pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-portal-muted">
                    Lessons
                  </h3>
                  <ol className="mt-3 divide-y divide-portal-border border border-portal-border bg-portal-surface">
                    {classItem.sessions.map((session) => {
                      const joinHref = mataClassroomUrl(classItem.id, session.sessionNumber);
                      const practiceHref = maumaharaUrl(classItem.id, session.sessionNumber);
                      return (
                      <li
                        key={`${classItem.id}-${session.sessionNumber}`}
                        className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-portal-ink">
                            Lesson {session.sessionNumber}
                          </p>
                          <p className="mt-0.5 text-xs text-portal-muted">
                            {formatSessionDate(session.sessionDate)} · {formatSessionTime(classItem.meetingStart, classItem.meetingEnd)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={joinHref}
                            className="rounded-lg border border-portal-border px-3 py-1.5 text-xs font-medium text-portal-accent hover:bg-portal-bg"
                            onClick={(e) => {
                              e.preventDefault();
                              logEcosystemLinkClick({
                                kind: 'mata-join-class',
                                href: joinHref,
                                classId: classItem.id,
                                lessonNumber: session.sessionNumber,
                              });
                              window.location.assign(joinHref);
                            }}
                          >
                            Join class
                          </a>
                          <a
                            href={practiceHref}
                            className="rounded-lg border border-portal-border px-3 py-1.5 text-xs font-medium text-portal-accent hover:bg-portal-bg"
                            onClick={(e) => {
                              e.preventDefault();
                              logEcosystemLinkClick({
                                kind: 'maumahara-practice',
                                href: practiceHref,
                                classId: classItem.id,
                                lessonNumber: session.sessionNumber,
                              });
                              window.location.assign(practiceHref);
                            }}
                          >
                            Practice
                          </a>
                        </div>
                      </li>
                    );
                    })}
                  </ol>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const vocabListClass =
  'divide-y divide-portal-border overflow-hidden rounded-lg border border-portal-border bg-portal-bg/40';

export default function Vocab() {
  const navigate = useNavigate();
  const { user, appUser, studentId, loading, signOut } = useAuth();
  const navTabs = portalNavForRole(appUser?.role, { adminIfStaff: true });
  const isStaffUser = Boolean(appUser && isStaffRole(appUser.role));

  const footer = (
    <PortalAccountFooter
      email={user?.email}
      roleLabel={isStaffUser ? 'Teacher' : 'Student'}
      onSignOut={() => void signOut().then(() => navigate('/login'))}
    />
  );
  const headerTrailing = (
    <PortalHeaderProfile
      name={user?.email ?? 'User'}
      roleLabel={isStaffUser ? 'Teacher' : 'Student'}
    />
  );

  const classNotesQuery = useQuery({
    queryKey: ['portal', 'student-class-notes', studentId],
    enabled: !isStaffUser && studentId != null,
    queryFn: async (): Promise<StudentClassNote[]> => {
      const { data, error } = await supabase
        .from('class_enrollments')
        .select(
          'class_id, classes(id, label, client_id, course_id, meeting_start, meeting_end, clients(name), teacher:app_users!classes_teacher_app_user_id_fkey(display_name, email), coordinator:app_users!classes_coordinator_app_user_id_fkey(display_name, email), courses(name, description), class_sessions(session_date, session_number))',
        )
        .eq('student_id', studentId as number);
      if (error) throw error;
      return normalizeStudentClassNotes((data ?? []) as ClassEnrollmentWithClass[]);
    },
  });

  const allWordsQuery = useQuery({
    queryKey: ['portal', 'word-registry'],
    queryFn: async (): Promise<WordRegistryRow[]> => {
      const { data, error } = await supabase
        .from('word_registry')
        .select('word_text, language, frequency_rank, metadata, pos_types')
        .order('word_text', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WordRegistryRow[];
    },
  });

  const courseGroupsQuery = useQuery({
    queryKey: ['portal', 'vocab-course-groups'],
    queryFn: fetchCourseWordGroups,
  });

  const posTypesQuery = useQuery({
    queryKey: ['portal', 'pos-types-colors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pos_types').select('id, color, code').order('id');
      if (error) throw error;
      return (data ?? []) as { id: number; color: string | null; code: string | null }[];
    },
  });

  const posById = useMemo(() => {
    const m = new Map<number, { color?: string | null; code?: string | null }>();
    for (const r of posTypesQuery.data ?? []) {
      m.set(r.id, { color: r.color, code: r.code });
    }
    return m;
  }, [posTypesQuery.data]);

  const registryByText = new Map((allWordsQuery.data ?? []).map((r) => [r.word_text, r]));
  const assignedTexts = new Set((courseGroupsQuery.data ?? []).flatMap((g) => g.wordTexts));
  const unlinkedWords = (allWordsQuery.data ?? []).filter((w) => !assignedTexts.has(w.word_text));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-portal-bg text-portal-muted">
        Loading…
      </div>
    );
  }

  if (appUser && isHrAdminRole(appUser.role)) {
    return <Navigate to="/hr" replace />;
  }

  if (!isStaffUser) {
    return (
      <PortalShell
        sidebar={<PortalSidebar tabs={navTabs} />}
        headerTitle="Course"
        headerTrailing={headerTrailing}
        mobileTabs={navTabs}
        mainClassName="w-full flex-1 px-0 py-0"
      >
        <StudentClassNotesNavigator
          classes={classNotesQuery.data ?? []}
          isError={classNotesQuery.isError}
          isPending={classNotesQuery.isPending}
          errorMessage={classNotesQuery.isError ? (classNotesQuery.error as Error).message : null}
        />
      </PortalShell>
    );
  }

  const listPending = allWordsQuery.isPending || courseGroupsQuery.isPending;
  const listError = allWordsQuery.isError
    ? (allWordsQuery.error as Error).message
    : courseGroupsQuery.isError
      ? (courseGroupsQuery.error as Error).message
      : null;

  return (
    <PortalShell
      sidebar={<PortalSidebar tabs={navTabs} footer={footer} />}
      headerTitle="Course"
      headerTrailing={headerTrailing}
      mobileTabs={navTabs}
      mainClassName="mx-auto w-full max-w-3xl flex-1 px-6 py-8"
    >
      <PortalCard className="p-8">
        <h1 className="text-lg font-semibold text-portal-ink">My Vocab</h1>
        <p className="mt-2 text-sm text-portal-muted">
          Full word registry, grouped by course where words are taught. Words not in any course appear
          last.
        </p>
        {listPending ? (
          <p className="mt-6 text-sm text-portal-muted">Loading words…</p>
        ) : listError ? (
          <p className="mt-6 text-sm text-portal-danger">{listError}</p>
        ) : (allWordsQuery.data?.length ?? 0) === 0 ? (
          <p className="mt-6 text-sm text-portal-muted">No words in the registry yet.</p>
        ) : (
          <div className="mt-6 space-y-8">
            {(courseGroupsQuery.data ?? []).map((sec) => (
              <section key={sec.courseId} aria-labelledby={`vocab-course-${sec.courseId}`}>
                <h2 id={`vocab-course-${sec.courseId}`} className="text-sm font-semibold text-portal-ink">
                  {sec.courseName}
                </h2>
                <div className="mt-3 space-y-4">
                  {groupWordTextsByPrimaryPos(sec.wordTexts, registryByText, posById).map((g) => (
                    <div key={`${sec.courseId}-${g.sortKey}`}>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-portal-muted">
                        {g.label}
                      </h3>
                      <ul
                        className={`mt-2 ${vocabListClass}`}
                        aria-label={`${g.label} — ${sec.courseName}`}
                      >
                        {g.texts.map((t) => {
                          const w = registryByText.get(t) ?? registryFallback(t);
                          return (
                            <VocabWordListItem
                              key={`${sec.courseId}-${t}`}
                              rowKey={`${sec.courseId}-${t}`}
                              posById={posById}
                              w={w}
                            />
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {unlinkedWords.length > 0 ? (
              <section aria-labelledby="vocab-unlinked">
                <h2 id="vocab-unlinked" className="text-sm font-semibold text-portal-ink">
                  Not linked to any course
                </h2>
                <p className="mt-0.5 text-xs text-portal-muted">
                  These words are in the registry but have no row in course_words yet.
                </p>
                <div className="mt-3 space-y-4">
                  {groupWordTextsByPrimaryPos(
                    unlinkedWords.map((w) => w.word_text),
                    registryByText,
                    posById,
                  ).map((g) => (
                    <div key={`unlinked-${g.sortKey}`}>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-portal-muted">
                        {g.label}
                      </h3>
                      <ul
                        className={`mt-2 ${vocabListClass}`}
                        aria-label={`${g.label} — not linked to any course`}
                      >
                        {g.texts.map((t) => {
                          const w = registryByText.get(t) ?? registryFallback(t);
                          return (
                            <VocabWordListItem
                              key={`unlinked-${t}`}
                              rowKey={`unlinked-${t}`}
                              posById={posById}
                              w={w}
                            />
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </PortalCard>
    </PortalShell>
  );
}
