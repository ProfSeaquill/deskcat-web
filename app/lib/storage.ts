export type ReflectionPathEntry = {
  nodeId: string;
  answer: string;
  nextNodeId?: string | null;
};

export type SessionLog = {
  id: string;
  createdAt: string;
  sessionType: string;
  durationSec?: number;
  outcome?: string;
  focusArea?: string;
  nextFocus?: string;
  reflectionPath: ReflectionPathEntry[];
};

type StoredSessionLog = SessionLog & {
  craftFocus?: string;
};

const KEY = "deskcat.sessions.v1";

function normalizeOutcome(outcome?: string) {
  switch (outcome) {
    case "flow":
      return "overallPositive";
    case "struggle":
      return "overallNegative";
    case "unclear":
      return "overallMixed";
    default:
      return outcome;
  }
}

function normalizeSession(entry: StoredSessionLog): SessionLog {
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    sessionType: entry.sessionType,
    durationSec: entry.durationSec,
    outcome: normalizeOutcome(entry.outcome),
    focusArea: entry.focusArea,
    nextFocus: entry.nextFocus ?? entry.craftFocus,
    reflectionPath: Array.isArray(entry.reflectionPath) ? entry.reflectionPath : []
  };
}

export function loadSessions(): SessionLog[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeSession) : [];
  } catch {
    return [];
  }
}

export function saveSession(entry: SessionLog) {
  const all = loadSessions();
  all.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(all));
}

function toDayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function computeStreaks(sessions: SessionLog[]) {
  // Unique days that have at least one saved session
  const daySet = new Set<string>();
  for (const s of sessions) {
    const dt = new Date(s.createdAt);
    if (!isNaN(dt.getTime())) daySet.add(toDayKey(dt));
  }

  const hasDay = (d: Date) => daySet.has(toDayKey(d));

  // Current streak ending today
  let current = 0;
  let cursor = new Date();
  while (hasDay(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  // Best streak: scan backwards from today until we run out of history
  // We'll examine all known days by sorting them.
  const days = Array.from(daySet).sort(); // YYYY-MM-DD sorts chronologically
  let best = 0;
  let run = 0;
  let prev: string | null = null;

  for (const day of days) {
    if (!prev) {
      run = 1;
    } else {
      const prevDate = new Date(prev + "T00:00:00");
      const curDate = new Date(day + "T00:00:00");
      const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / 86400000);

      run = diffDays === 1 ? run + 1 : 1;
    }
    best = Math.max(best, run);
    prev = day;
  }

  // Sessions in last 7 days (including today)
  const now = new Date();
  const weekAgo = addDays(now, -6); // last 7 days window
  const sessionsLast7 = sessions.filter((s) => {
    const dt = new Date(s.createdAt);
    return !isNaN(dt.getTime()) && dt >= weekAgo && dt <= now;
  }).length;

  return { currentStreak: current, bestStreak: best, sessionsLast7 };
}

const LAST_REACTION_KEY = "deskcat.lastReaction.v1";

export type LastReaction = {
  createdAt: string;
  message: string;
  outcome?: string;
  sessionType?: string;
};

export function saveLastReaction(r: LastReaction) {
  localStorage.setItem(LAST_REACTION_KEY, JSON.stringify(r));
}

export function loadLastReaction(): LastReaction | null {
  try {
    const raw = localStorage.getItem(LAST_REACTION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastReaction;
  } catch {
    return null;
  }
}
