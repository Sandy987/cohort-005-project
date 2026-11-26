import { describe, it, expect } from "vitest";
import { addCourse, addLesson, addModule, outline, setUp } from "./fixtures";

function setUpWithOtherCourse() {
  const base = setUp();
  const other = addCourse(base.db, base.instructor.id, base.category.id);
  const otherModule = addModule(base.editor, other, "Theirs");
  const otherLesson = addLesson(
    base.editor,
    other,
    otherModule.id
  )("Their lesson");
  return { ...base, other, otherModule, otherLesson };
}

const moduleNotFound = {
  error: "Module not found in this course.",
  status: 404,
};
const lessonNotFound = { error: "Lesson not found.", status: 404 };
const lessonNotInCourse = {
  error: "Lesson not found in this course.",
  status: 404,
};

describe("courseEditor.apply: modules", () => {
  it("adds modules at the end", () => {
    const { editor, course } = setUp();
    addModule(editor, course, "First");
    addModule(editor, course, "Second");

    expect(outline(editor, course.id)).toEqual([
      ["First", []],
      ["Second", []],
    ]);
  });

  it("renames a module", () => {
    const { editor, course } = setUp();
    const mod = addModule(editor, course, "Old");

    expect(
      editor.apply(course, {
        intent: "rename-module",
        moduleId: mod.id,
        title: "New",
      })
    ).toEqual({ success: true, field: "module" });
    expect(outline(editor, course.id)).toEqual([["New", []]]);
  });

  it("deletes a module and its lessons", () => {
    const { editor, course } = setUp();
    const mod = addModule(editor, course, "Doomed");
    addLesson(editor, course, mod.id)("Gone too");

    expect(
      editor.apply(course, { intent: "delete-module", moduleId: mod.id })
    ).toEqual({ success: true, field: "module" });
    expect(editor.getPage(course.id)).toMatchObject({
      course: { modules: [] },
      lessonCount: 0,
    });
  });

  it("reorders modules", () => {
    const { editor, course } = setUp();
    const a = addModule(editor, course, "A");
    const b = addModule(editor, course, "B");
    const c = addModule(editor, course, "C");

    expect(
      editor.apply(course, {
        intent: "reorder-modules",
        moduleIds: JSON.stringify([c.id, a.id, b.id]),
      })
    ).toEqual({ success: true, field: "module-reorder" });
    expect(outline(editor, course.id)?.map(([title]) => title)).toEqual([
      "C",
      "A",
      "B",
    ]);
  });

  it("refuses to touch another course's module", () => {
    const { editor, course, other, otherModule } = setUpWithOtherCourse();

    for (const action of [
      { intent: "rename-module", moduleId: otherModule.id, title: "Mine" },
      { intent: "delete-module", moduleId: otherModule.id },
      { intent: "add-lesson", moduleId: otherModule.id, title: "Sneaky" },
      { intent: "reorder-lessons", moduleId: otherModule.id, lessonIds: "[]" },
    ] as const) {
      expect(editor.apply(course, action)).toEqual(moduleNotFound);
    }
    expect(outline(editor, other.id)).toEqual([["Theirs", ["Their lesson"]]]);
  });
});

describe("courseEditor.apply: lessons", () => {
  it("adds, renames and deletes a lesson", () => {
    const { editor, course } = setUp();
    const mod = addModule(editor, course, "M");
    const lesson = addLesson(editor, course, mod.id)("Draft");

    expect(
      editor.apply(course, {
        intent: "rename-lesson",
        lessonId: lesson.id,
        title: "Final",
      })
    ).toEqual({ success: true, field: "lesson" });
    expect(outline(editor, course.id)).toEqual([["M", ["Final"]]]);

    expect(
      editor.apply(course, { intent: "delete-lesson", lessonId: lesson.id })
    ).toEqual({ success: true, field: "lesson" });
    expect(outline(editor, course.id)).toEqual([["M", []]]);
  });

  it("reorders lessons within a module", () => {
    const { editor, course } = setUp();
    const mod = addModule(editor, course, "M");
    const [one, two, three] = ["1", "2", "3"].map(
      addLesson(editor, course, mod.id)
    );

    expect(
      editor.apply(course, {
        intent: "reorder-lessons",
        moduleId: mod.id,
        lessonIds: JSON.stringify([three.id, one.id, two.id]),
      })
    ).toEqual({ success: true, field: "lesson-reorder" });
    expect(outline(editor, course.id)).toEqual([["M", ["3", "1", "2"]]]);
  });

  it("moves a lesson into another module at a position", () => {
    const { editor, course } = setUp();
    const from = addModule(editor, course, "From");
    const to = addModule(editor, course, "To");
    const [, moving] = ["a", "b", "c"].map(addLesson(editor, course, from.id));
    ["x", "y"].map(addLesson(editor, course, to.id));

    expect(
      editor.apply(course, {
        intent: "move-lesson",
        lessonId: moving.id,
        targetModuleId: to.id,
        targetPosition: 2,
      })
    ).toEqual({ success: true, field: "lesson-move" });
    expect(outline(editor, course.id)).toEqual([
      ["From", ["a", "c"]],
      ["To", ["x", "b", "y"]],
    ]);
  });

  it("refuses a lesson that doesn't exist", () => {
    const { editor, course } = setUp();
    const mod = addModule(editor, course, "M");

    for (const action of [
      { intent: "rename-lesson", lessonId: 9999, title: "X" },
      { intent: "delete-lesson", lessonId: 9999 },
      {
        intent: "move-lesson",
        lessonId: 9999,
        targetModuleId: mod.id,
        targetPosition: 1,
      },
    ] as const) {
      expect(editor.apply(course, action)).toEqual(lessonNotFound);
    }
  });

  it("refuses to touch another course's lesson", () => {
    const { editor, course, other, otherLesson } = setUpWithOtherCourse();
    const mod = addModule(editor, course, "Mine");

    for (const action of [
      { intent: "rename-lesson", lessonId: otherLesson.id, title: "X" },
      { intent: "delete-lesson", lessonId: otherLesson.id },
      {
        intent: "move-lesson",
        lessonId: otherLesson.id,
        targetModuleId: mod.id,
        targetPosition: 1,
      },
    ] as const) {
      expect(editor.apply(course, action)).toEqual(lessonNotInCourse);
    }
    expect(outline(editor, other.id)).toEqual([["Theirs", ["Their lesson"]]]);
  });

  it("refuses to move a lesson into another course's module", () => {
    const { editor, course, other, otherModule } = setUpWithOtherCourse();
    const mod = addModule(editor, course, "Mine");
    const lesson = addLesson(editor, course, mod.id)("Stay");

    expect(
      editor.apply(course, {
        intent: "move-lesson",
        lessonId: lesson.id,
        targetModuleId: otherModule.id,
        targetPosition: 1,
      })
    ).toEqual({
      error: "Target module not found in this course.",
      status: 404,
    });
    expect(outline(editor, course.id)).toEqual([["Mine", ["Stay"]]]);
    expect(outline(editor, other.id)).toEqual([["Theirs", ["Their lesson"]]]);
  });
});
