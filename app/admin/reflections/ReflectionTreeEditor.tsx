"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  REFLECTION_ANSWER_ACTIONS,
  REFLECTION_AREAS,
  REFLECTION_OUTCOMES,
  validateReflectionTree,
  type ReflectionAnswer,
  type ReflectionTree
} from "../../lib/reflectionTree";
import {
  NODE_ID_PATTERN,
  addAnswer,
  addNode,
  deleteNode,
  inboundCounts,
  moveAnswer,
  reachableFromStart,
  referrersOf,
  removeAnswer,
  renameNode,
  setNodeKind,
  setStartNode,
  updateAnswer,
  updateNode
} from "./reflectionTreeEdits";

type Props = {
  initialDocument: ReflectionTree;
  initialLabel: string;
  hasDraft: boolean;
  hasRevisions: boolean;
};

const inputClass = "theme-input mt-2 w-full rounded-xl border px-3 py-2 text-sm";
const buttonClass =
  "theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const primaryButtonClass = buttonClass.replace("theme-button-secondary", "theme-button-primary");

export default function ReflectionTreeEditor({
  initialDocument,
  initialLabel,
  hasDraft,
  hasRevisions
}: Props) {
  const router = useRouter();

  const [document, setDocument] = useState<ReflectionTree>(initialDocument);
  const [savedDocument, setSavedDocument] = useState<ReflectionTree>(initialDocument);
  const [label, setLabel] = useState(initialLabel);
  const [selectedId, setSelectedId] = useState(initialDocument.start);
  const [renameValue, setRenameValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    hasDraft ? "Editing an unpublished draft." : null
  );
  const [problems, setProblems] = useState<string[]>([]);

  const report = useMemo(() => validateReflectionTree(document), [document]);
  const inbound = useMemo(() => inboundCounts(document), [document]);
  const reachable = useMemo(() => reachableFromStart(document), [document]);
  const nodeIds = useMemo(() => Object.keys(document.nodes), [document]);

  const dirty = useMemo(
    () => JSON.stringify(document) !== JSON.stringify(savedDocument),
    [document, savedDocument]
  );

  const node = document.nodes[selectedId] ?? document.nodes[document.start];
  const canPublish = report.errors.length === 0 && !busy;

  function apply(next: ReflectionTree) {
    setDocument(next);
    setNotice(null);
    setProblems([]);
  }

  async function send(method: "PUT" | "POST", body: unknown, successMessage: string) {
    setBusy(true);
    setProblems([]);

    try {
      const response = await fetch("/api/admin/reflections", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setProblems(
          Array.isArray(payload?.errors) && payload.errors.length > 0
            ? payload.errors
            : [payload?.error ?? "The request failed."]
        );
        setNotice(null);
        return false;
      }

      setNotice(successMessage);
      return true;
    } catch {
      setProblems(["Could not reach the server."]);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    const ok = await send("PUT", { document, label }, "Draft saved.");
    if (ok) {
      setSavedDocument(document);
      router.refresh();
    }
  }

  async function publish() {
    // Publishing always goes through a draft, so save first when there is no draft
    // row yet -- otherwise clicking Publish on an untouched tree would be refused.
    if (dirty || !hasDraft) {
      const saved = await send("PUT", { document, label }, "Draft saved.");
      if (!saved) return;
      setSavedDocument(document);
    }

    const ok = await send("POST", { action: "publish" }, "Published. Writers see this tree now.");
    if (ok) router.refresh();
  }

  async function discard() {
    const ok = await send("POST", { action: "discard" }, "Draft discarded.");
    if (ok) router.refresh();
  }

  async function seed() {
    const ok = await send("POST", { action: "seed" }, "Imported the bundled tree as revision 1.");
    if (ok) router.refresh();
  }

  function commitRename() {
    const nextId = (renameValue ?? "").trim();
    setRenameValue(null);

    if (!nextId || nextId === node.id) return;

    if (!NODE_ID_PATTERN.test(nextId)) {
      setProblems([`"${nextId}" is not a valid node id. Use lowercase letters, digits and underscores.`]);
      return;
    }
    if (document.nodes[nextId]) {
      setProblems([`A node called "${nextId}" already exists.`]);
      return;
    }

    apply(renameNode(document, node.id, nextId));
    setSelectedId(nextId);
  }

  function removeNode() {
    if (node.id === document.start) {
      setProblems(["The start node cannot be deleted. Point the start at another node first."]);
      return;
    }

    const referrers = referrersOf(document, node.id);
    if (referrers.length > 0) {
      setProblems([
        `"${node.id}" is still reached from ${referrers.join(", ")}. Repoint those answers first.`
      ]);
      return;
    }

    apply(deleteNode(document, node.id));
    setSelectedId(document.start);
  }

  return (
    <div className="space-y-4">
      <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="theme-text-secondary block flex-1 text-sm font-medium">
            Draft note
            <input
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="What changed, so future you can read the history"
              className={inputClass}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass} onClick={saveDraft} disabled={busy || !dirty}>
              {dirty ? "Save draft" : "Saved"}
            </button>
            <button type="button" className={primaryButtonClass} onClick={publish} disabled={!canPublish}>
              Publish
            </button>
            {hasDraft && (
              <button type="button" className={buttonClass} onClick={discard} disabled={busy}>
                Discard draft
              </button>
            )}
            {!hasRevisions && (
              <button type="button" className={buttonClass} onClick={seed} disabled={busy}>
                Import bundled tree
              </button>
            )}
          </div>
        </div>

        {report.errors.length > 0 && (
          <p className="theme-text-primary mt-4 text-sm font-medium">
            {report.errors.length} problem{report.errors.length === 1 ? "" : "s"} must be fixed before
            publishing.
          </p>
        )}
        {notice && <p className="theme-text-secondary mt-4 text-sm">{notice}</p>}
        {problems.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {problems.map((problem) => (
              <li key={problem} className="theme-text-primary font-medium">
                {problem}
              </li>
            ))}
          </ul>
        )}
      </section>

      {(report.errors.length > 0 || report.warnings.length > 0) && (
        <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <h2 className="theme-text-primary text-xl font-semibold">Validation</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {report.errors.map((message) => (
              <li key={message} className="theme-text-primary font-medium">
                Error: {message}
              </li>
            ))}
            {report.warnings.map((message) => (
              <li key={message} className="theme-text-secondary">
                Warning: {message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="theme-surface rounded-[28px] border p-5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <h2 className="theme-text-primary text-xl font-semibold">Nodes</h2>
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                const result = addNode(document);
                apply(result.document);
                setSelectedId(result.nodeId);
              }}
            >
              Add
            </button>
          </div>

          <ul className="mt-4 space-y-1">
            {nodeIds.map((nodeId) => {
              const listNode = document.nodes[nodeId];
              const isSelected = nodeId === selectedId;
              const isOrphan = !reachable.has(nodeId);

              return (
                <li key={nodeId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(nodeId);
                      setRenameValue(null);
                    }}
                    className={`theme-hover-highlight w-full rounded-xl border px-3 py-2 text-left transition ${
                      isSelected ? "theme-button-primary" : "theme-subsurface"
                    }`}
                  >
                    <span className="theme-text-primary block truncate text-sm font-medium">
                      {nodeId}
                    </span>
                    <span className="theme-text-secondary mt-0.5 block truncate text-xs">
                      {listNode.question}
                    </span>
                    <span className="theme-text-tertiary mt-1 block text-xs">
                      {nodeId === document.start ? "start · " : ""}
                      {listNode.kind === "terminal" ? "terminal · " : ""}
                      {inbound[nodeId]} in · {listNode.answers.length} answers
                      {isOrphan ? " · unreachable" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="theme-text-secondary block flex-1 text-sm font-medium">
              Node id
              <input
                type="text"
                value={renameValue ?? node.id}
                onChange={(event) => setRenameValue(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") setRenameValue(null);
                }}
                className={inputClass}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClass}
                onClick={() => apply(setStartNode(document, node.id))}
                disabled={node.id === document.start}
              >
                {node.id === document.start ? "Is start" : "Make start"}
              </button>
              <button
                type="button"
                className={buttonClass}
                onClick={() =>
                  apply(setNodeKind(document, node.id, node.kind === "terminal" ? "question" : "terminal"))
                }
              >
                {node.kind === "terminal" ? "Make question" : "Make terminal"}
              </button>
              <button type="button" className={buttonClass} onClick={removeNode}>
                Delete node
              </button>
            </div>
          </div>

          <label className="theme-text-secondary mt-5 block text-sm font-medium">
            Question
            <textarea
              value={node.question}
              rows={2}
              onChange={(event) => apply(updateNode(document, node.id, { question: event.target.value }))}
              className={inputClass}
            />
          </label>

          <div className="mt-6 flex items-center justify-between gap-3">
            <h3 className="theme-text-primary text-lg font-semibold">Answers</h3>
            <button
              type="button"
              className={buttonClass}
              onClick={() => apply(addAnswer(document, node.id))}
            >
              Add answer
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {node.answers.map((answer, index) => (
              <AnswerRow
                key={`${node.id}:${index}`}
                answer={answer}
                index={index}
                total={node.answers.length}
                isTerminal={node.kind === "terminal"}
                nodeIds={nodeIds}
                onChange={(patch) => apply(updateAnswer(document, node.id, index, patch))}
                onMove={(delta) => apply(moveAnswer(document, node.id, index, delta))}
                onRemove={() => apply(removeAnswer(document, node.id, index))}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function AnswerRow({
  answer,
  index,
  total,
  isTerminal,
  nodeIds,
  onChange,
  onMove,
  onRemove
}: {
  answer: ReflectionAnswer;
  index: number;
  total: number;
  isTerminal: boolean;
  nodeIds: string[];
  onChange: (patch: Partial<ReflectionAnswer>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="theme-subsurface rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="theme-text-tertiary text-xs font-semibold uppercase tracking-[0.16em]">
          Answer {index + 1}
        </span>
        <div className="flex gap-1">
          <button type="button" className={buttonClass} onClick={() => onMove(-1)} disabled={index === 0}>
            ↑
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => onMove(1)}
            disabled={index === total - 1}
          >
            ↓
          </button>
          <button type="button" className={buttonClass} onClick={onRemove} disabled={total === 1}>
            Remove
          </button>
        </div>
      </div>

      <label className="theme-text-secondary block text-sm font-medium">
        Label
        <input
          type="text"
          value={answer.label}
          onChange={(event) => onChange({ label: event.target.value })}
          className={inputClass}
        />
      </label>

      <label className="theme-text-secondary mt-3 block text-sm font-medium">
        Description (optional, shown under the label)
        <input
          type="text"
          value={answer.description ?? ""}
          onChange={(event) =>
            onChange({ description: event.target.value.trim() === "" ? undefined : event.target.value })
          }
          className={inputClass}
        />
      </label>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {isTerminal ? (
          <TagSelect
            label="Action"
            value={answer.action ?? ""}
            options={REFLECTION_ANSWER_ACTIONS}
            emptyLabel="— required —"
            onChange={(value) =>
              onChange({ action: (value || undefined) as ReflectionAnswer["action"] })
            }
          />
        ) : (
          <label className="theme-text-secondary block text-sm font-medium">
            Leads to
            <select
              value={answer.next ?? ""}
              onChange={(event) => onChange({ next: event.target.value || null })}
              className={inputClass}
            >
              <option value="">— nowhere —</option>
              {nodeIds.map((nodeId) => (
                <option key={nodeId} value={nodeId}>
                  {nodeId}
                </option>
              ))}
            </select>
          </label>
        )}

        <TagSelect
          label="Records outcome"
          value={answer.outcome ?? ""}
          options={REFLECTION_OUTCOMES}
          emptyLabel="— none —"
          onChange={(value) =>
            onChange({ outcome: (value || undefined) as ReflectionAnswer["outcome"] })
          }
        />

        <TagSelect
          label="Records area"
          value={answer.area ?? ""}
          options={REFLECTION_AREAS}
          emptyLabel="— none —"
          onChange={(value) => onChange({ area: (value || undefined) as ReflectionAnswer["area"] })}
        />

        <label className="theme-text-secondary flex items-end gap-2 pb-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={answer.recordAs === "nextFocus"}
            onChange={(event) => onChange({ recordAs: event.target.checked ? "nextFocus" : undefined })}
            className="h-4 w-4 accent-sky-300"
          />
          Record this label as the next focus
        </label>
      </div>
    </div>
  );
}

function TagSelect({
  label,
  value,
  options,
  emptyLabel,
  onChange
}: {
  label: string;
  value: string;
  options: readonly string[];
  emptyLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="theme-text-secondary block text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
