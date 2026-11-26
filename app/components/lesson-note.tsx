import { useState } from "react";
import { useFetcher } from "react-router";
import { Check, Lock, NotebookPen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import {
  noteEditorState,
  type NoteEditorState,
  type NoteEditorStatus,
} from "~/modules/lesson-note";
import type { FullLessonData } from "~/modules/lesson-page";
import { cn, formatRelativeTime } from "~/lib/utils";

export type LessonNoteData = FullLessonData["note"];

/**
 * The Student's private Note on a Lesson. Laid out like the Questions &
 * Discussion card below it, so the two read as parts of the same page.
 *
 * Render it with `key={lessonId}`: the draft is local state and must not
 * carry over when the Student moves to the next Lesson.
 */
export function LessonNote({ note }: { note: LessonNoteData }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [draft, setDraft] = useState(note?.body ?? "");
  const [submittedDraft, setSubmittedDraft] = useState<string | null>(null);
  const state = noteEditorState({
    savedBody: note?.body ?? null,
    draft,
    isSaving: fetcher.state !== "idle",
    error: fetcher.data?.error,
    submittedDraft,
  });

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <NoteHeader />

        <fetcher.Form
          method="post"
          className="space-y-3"
          onSubmit={() => setSubmittedDraft(draft)}
        >
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            aria-label="Your notes"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Jot down what you want to remember from this lesson…"
            className="min-h-32 resize-y"
          />
          <NoteFooter state={state} updatedAt={note?.updatedAt} />
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function NoteFooter({
  state,
  updatedAt,
}: {
  state: NoteEditorState;
  updatedAt: string | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <NoteStatus status={state.status} updatedAt={updatedAt} />
      <div className="flex items-center gap-3">
        {state.showCount && (
          <span
            className={cn(
              "text-xs tabular-nums text-muted-foreground",
              state.length > state.maxLength && "text-destructive"
            )}
          >
            {state.length.toLocaleString("en")} /{" "}
            {state.maxLength.toLocaleString("en")}
          </span>
        )}
        <Button type="submit" size="sm" disabled={!state.canSave}>
          {state.status.kind === "saving" ? "Saving…" : "Save note"}
        </Button>
      </div>
    </div>
  );
}

function NoteHeader() {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <NotebookPen className="size-5 text-primary" />
        <h2 className="text-xl font-semibold">Your notes</h2>
      </div>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Only you can see these
      </span>
    </div>
  );
}

function NoteStatus({
  status,
  updatedAt,
}: {
  status: NoteEditorStatus;
  updatedAt: string | undefined;
}) {
  switch (status.kind) {
    case "error":
      return (
        <span role="alert" className="text-sm text-destructive">
          {status.message}
        </span>
      );
    case "too-long":
      return (
        <span className="text-sm text-destructive">
          {status.over.toLocaleString("en")} characters over the limit
        </span>
      );
    case "cleared":
      return (
        <span className="text-xs text-muted-foreground">
          A note can't be empty. Write something to save it.
        </span>
      );
    case "unsaved":
      return (
        <span className="text-xs text-muted-foreground">Unsaved changes</span>
      );
    case "saved":
      return (
        <span
          suppressHydrationWarning
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Check className="size-3.5" />
          Saved{updatedAt && ` ${formatRelativeTime(updatedAt)}`}
        </span>
      );
    case "saving":
    case "empty":
      return <span />;
  }
}
