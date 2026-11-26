import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteEditorInput = {
  /** The body as last saved, or null when the Student has no Note yet. */
  savedBody: string | null;
  /** What is in the textarea now. */
  draft: string;
  isSaving: boolean;
  /** The error the last save came back with, if it failed. */
  error: string | undefined;
  /** The draft that last save sent, so its error clears once the Student edits. */
  submittedDraft: string | null;
};

export type NoteEditorStatus =
  | { kind: "saving" }
  | { kind: "error"; message: string }
  | { kind: "too-long"; over: number }
  | { kind: "cleared" }
  | { kind: "unsaved" }
  | { kind: "saved" }
  | { kind: "empty" };

export type NoteEditorState = {
  status: NoteEditorStatus;
  canSave: boolean;
  length: number;
  maxLength: number;
  /** Show the counter once the Student is close enough to the limit to care. */
  showCount: boolean;
};

const COUNT_THRESHOLD = MAX_NOTE_LENGTH * 0.8;

export function noteEditorState(input: NoteEditorInput): NoteEditorState {
  const trimmed = input.draft.trim();
  const length = trimmed.length;
  // The server trims before it stores, so a trailing newline is not an edit.
  const isDirty = trimmed !== (input.savedBody ?? "");
  const isTooLong = length > MAX_NOTE_LENGTH;

  return {
    status: statusOf(input, { length, isDirty, isTooLong }),
    canSave: !input.isSaving && isDirty && length > 0 && !isTooLong,
    length,
    maxLength: MAX_NOTE_LENGTH,
    showCount: length >= COUNT_THRESHOLD,
  };
}

function statusOf(
  input: NoteEditorInput,
  draft: { length: number; isDirty: boolean; isTooLong: boolean }
): NoteEditorStatus {
  if (input.isSaving) return { kind: "saving" };
  if (draft.isTooLong) {
    return { kind: "too-long", over: draft.length - MAX_NOTE_LENGTH };
  }
  if (input.error && input.draft === input.submittedDraft) {
    return { kind: "error", message: input.error };
  }
  if (draft.isDirty && draft.length === 0) return { kind: "cleared" };
  if (draft.isDirty) return { kind: "unsaved" };
  if (input.savedBody !== null) return { kind: "saved" };
  return { kind: "empty" };
}
