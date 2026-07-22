import { getAreaLabel, getOutcomeLabel } from "../lib/reflection";
import type { SessionLog } from "../lib/storage";

function getTimestamp(iso: string) {
  const timestamp = Date.parse(iso);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDateLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatDateTimeLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function formatTimeLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function toDayKey(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function SessionCard({
  session,
  timestampLabel
}: {
  session: SessionLog;
  timestampLabel: string;
}) {
  return (
    <li className="theme-subsurface rounded-xl border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-medium">
          {session.sessionType} • {getOutcomeLabel(session.outcome)}
        </div>
        <div className="theme-text-secondary text-sm">{timestampLabel}</div>
      </div>

      {getAreaLabel(session.focusArea) && (
        <div className="theme-text-secondary mt-1 text-sm">
          Focus area: <span className="font-medium">{getAreaLabel(session.focusArea)}</span>
        </div>
      )}

      <div className="theme-text-secondary mt-1 text-sm">
        Next focus: <span className="font-medium">{session.nextFocus ?? "—"}</span>
      </div>

      <details className="mt-2">
        <summary className="theme-text-secondary cursor-pointer text-sm">
          Show reflection path
        </summary>
        <ol className="theme-text-secondary mt-2 list-decimal space-y-1 pl-5 text-sm">
          {session.reflectionPath.map((entry, index) => (
            <li key={`${session.id}-${index}`}>
              <span className="font-medium">{entry.nodeId}</span>: {entry.answer}
            </li>
          ))}
        </ol>
      </details>
    </li>
  );
}

export default function SessionHistoryList({
  sessions,
  emptyMessage,
  groupByDate = false,
  limit
}: {
  sessions: SessionLog[];
  emptyMessage: string;
  groupByDate?: boolean;
  limit?: number;
}) {
  const orderedSessions = [...sessions].sort(
    (left, right) => getTimestamp(right.createdAt) - getTimestamp(left.createdAt)
  );
  const visibleSessions = typeof limit === "number" ? orderedSessions.slice(0, limit) : orderedSessions;

  if (visibleSessions.length === 0) {
    return <p className="theme-text-secondary mt-3">{emptyMessage}</p>;
  }

  if (!groupByDate) {
    return (
      <ul className="mt-3 space-y-3">
        {visibleSessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            timestampLabel={formatDateTimeLabel(session.createdAt)}
          />
        ))}
      </ul>
    );
  }

  const groups = visibleSessions.reduce<Array<{ dayKey: string; label: string; sessions: SessionLog[] }>>(
    (allGroups, session) => {
      const dayKey = toDayKey(session.createdAt);
      const lastGroup = allGroups[allGroups.length - 1];

      if (lastGroup && lastGroup.dayKey === dayKey) {
        lastGroup.sessions.push(session);
        return allGroups;
      }

      allGroups.push({
        dayKey,
        label: formatDateLabel(session.createdAt),
        sessions: [session]
      });

      return allGroups;
    },
    []
  );

  return (
    <div className="mt-3 space-y-5">
      {groups.map((group) => (
        <section key={group.dayKey} className="space-y-3">
          <h3 className="theme-text-primary text-lg font-semibold">{group.label}</h3>
          <ul className="space-y-3">
            {group.sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                timestampLabel={formatTimeLabel(session.createdAt)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
