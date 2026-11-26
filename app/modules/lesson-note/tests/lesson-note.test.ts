import { describe, it, expect } from "vitest";
import { noteEditorState } from "../index";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

const base = { savedBody: null, draft: "", isSaving: false, error: undefined };

describe("noteEditorState", () => {
  it("is empty and cannot save before the Student writes anything", () => {
    const state = noteEditorState(base);
    expect(state.status).toEqual({ kind: "empty" });
    expect(state.canSave).toBe(false);
  });

  it("cannot save a draft of only whitespace", () => {
    const state = noteEditorState({ ...base, draft: "   \n " });
    expect(state.canSave).toBe(false);
    expect(state.length).toBe(0);
  });

  it("cannot save a cleared Note, since the server refuses an empty one", () => {
    const state = noteEditorState({ ...base, savedBody: "a", draft: "  " });
    expect(state.status).toEqual({ kind: "unsaved" });
    expect(state.canSave).toBe(false);
  });

  it("reports unsaved changes once the draft differs from the saved Note", () => {
    const state = noteEditorState({ ...base, savedBody: "a", draft: "ab" });
    expect(state.status).toEqual({ kind: "unsaved" });
    expect(state.canSave).toBe(true);
  });

  it("is saved when the draft matches the saved Note, ignoring surrounding whitespace", () => {
    const state = noteEditorState({
      ...base,
      savedBody: "union types",
      draft: "union types\n",
    });
    expect(state.status).toEqual({ kind: "saved" });
    expect(state.canSave).toBe(false);
  });

  it("shows saving while a save is in flight and blocks a second one", () => {
    const state = noteEditorState({ ...base, draft: "x", isSaving: true });
    expect(state.status).toEqual({ kind: "saving" });
    expect(state.canSave).toBe(false);
  });

  it("surfaces the error the last save came back with", () => {
    const state = noteEditorState({ ...base, draft: "x", error: "Nope" });
    expect(state.status).toEqual({ kind: "error", message: "Nope" });
  });

  it("blocks saving and says by how much a draft is over the limit", () => {
    const state = noteEditorState({
      ...base,
      draft: "x".repeat(MAX_NOTE_LENGTH + 3),
    });
    expect(state.status).toEqual({ kind: "too-long", over: 3 });
    expect(state.canSave).toBe(false);
  });

  it("allows a draft of exactly the limit", () => {
    const state = noteEditorState({
      ...base,
      draft: "x".repeat(MAX_NOTE_LENGTH),
    });
    expect(state.canSave).toBe(true);
    expect(state.status).toEqual({ kind: "unsaved" });
  });

  it("shows the counter only near the limit", () => {
    const threshold = MAX_NOTE_LENGTH * 0.8;
    expect(
      noteEditorState({ ...base, draft: "x".repeat(threshold - 1) }).showCount
    ).toBe(false);
    const near = noteEditorState({ ...base, draft: "x".repeat(threshold) });
    expect(near.showCount).toBe(true);
    expect(near.length).toBe(threshold);
    expect(near.maxLength).toBe(MAX_NOTE_LENGTH);
  });
});
