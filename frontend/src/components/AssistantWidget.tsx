"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, ArrowUp } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import Button from "@/components/ui/Button";
import { Notice } from "@/components/ui/Field";

type Turn = { role: "user" | "assistant"; content: string };

/** Replayed with each question so follow-ups make sense; the API caps it too. */
const HISTORY_LIMIT = 6;

const SUGGESTIONS = [
  "Who is blocked this week, and by what?",
  "Who has not filed a report yet?",
  "Summarise what the team achieved this week.",
];

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest turn in view without moving the page behind the panel.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [turns, busy]);

  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function send(text: string) {
    const asked = text.trim();
    if (asked.length < 3 || busy) return;

    // The history goes out as it was *before* this question, because the
    // question is sent separately - including it twice confuses the model.
    const history = turns.slice(-HISTORY_LIMIT);

    setError(null);
    setQuestion("");
    setTurns((current) => [...current, { role: "user", content: asked }]);
    setBusy(true);

    try {
      const data = await api.post<{ answer: string }>("/assistant", {
        question: asked,
        history,
      });
      setTurns((current) => [
        ...current,
        { role: "assistant", content: data.answer },
      ]);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not reach the assistant"
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask the assistant about your team"
        className="fixed right-4 bottom-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-raised transition-colors hover:bg-accent-hover sm:right-6 sm:bottom-6"
      >
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Team assistant"
      className="fixed inset-x-3 bottom-3 z-30 flex max-h-[min(560px,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-raised sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-ink" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight">
            Team assistant
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close the assistant"
          className="-mr-1 rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {turns.length === 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-2">
              Ask about this week&rsquo;s reports. Answers come only from what
              your team has actually filed.
            </p>
            <div className="flex flex-col items-start gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="rounded-md border border-line px-2.5 py-1.5 text-left text-xs text-ink-2 transition-colors hover:bg-surface-muted hover:text-ink"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, index) => (
          <div
            key={index}
            className={
              turn.role === "user"
                ? "self-end rounded-lg bg-accent px-3 py-2 text-sm text-on-accent"
                : "self-start text-sm whitespace-pre-wrap text-ink"
            }
          >
            {turn.content}
          </div>
        ))}

        {busy && (
          <div className="self-start text-sm text-ink-3" role="status">
            Thinking&hellip;
          </div>
        )}

        {error && <Notice>{error}</Notice>}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(question);
        }}
        className="flex items-end gap-2 border-t border-line px-3 py-3"
      >
        <textarea
          ref={inputRef}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends, Shift+Enter starts a new line - the usual bargain.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(question);
            }
          }}
          rows={1}
          placeholder="Ask about this week"
          aria-label="Your question"
          className="max-h-24 min-h-9 flex-1 resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus-visible:border-accent"
        />
        <Button
          type="submit"
          size="sm"
          busy={busy}
          disabled={question.trim().length < 3}
          className="h-9 w-9 shrink-0 px-0"
          aria-label="Send"
        >
          {!busy && <ArrowUp className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </form>
    </div>
  );
}
