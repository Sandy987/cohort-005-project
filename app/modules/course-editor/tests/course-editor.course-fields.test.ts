import { describe, it, expect } from "vitest";
import { CourseStatus } from "~/db/schema";
import { courseEditorActionSchema } from "../index.server";
import { setUp } from "./fixtures";

describe("courseEditor.apply: course fields", () => {
  it("renames the course and keeps the description it was given", () => {
    const { editor, course } = setUp();

    const result = editor.apply(
      { ...course, description: "Kept" },
      { intent: "update-title", title: "Renamed" }
    );

    expect(result).toEqual({ success: true, field: "title" });
    expect(editor.getPage(course.id)?.course).toMatchObject({
      title: "Renamed",
      description: "Kept",
    });
  });

  it("changes the description and keeps the title it was given", () => {
    const { editor, course } = setUp();

    const result = editor.apply(
      { ...course, title: "Kept" },
      { intent: "update-description", description: "New words" }
    );

    expect(result).toEqual({ success: true, field: "description" });
    expect(editor.getPage(course.id)?.course).toMatchObject({
      title: "Kept",
      description: "New words",
    });
  });

  it("changes the status", () => {
    const { editor, course } = setUp();

    const result = editor.apply(course, {
      intent: "update-status",
      status: CourseStatus.Archived,
    });

    expect(result).toEqual({ success: true, field: "status" });
    expect(editor.getPage(course.id)?.course.status).toBe(
      CourseStatus.Archived
    );
  });

  it("stores a price in dollars as cents", () => {
    const { editor, course } = setUp();

    const result = editor.apply(course, {
      intent: "update-price",
      price: "19.99",
    });

    expect(result).toEqual({ success: true, field: "price" });
    expect(editor.getPage(course.id)?.course.price).toBe(1999);
  });

  it.each([
    ["abc", "Price must be a non-negative number."],
    ["-1", "Price must be a non-negative number."],
    ["10000", "Price cannot exceed $9,999.99."],
  ])("refuses the price %s and leaves the price alone", (price, error) => {
    const { editor, course } = setUp();
    editor.apply(course, { intent: "update-price", price: "5" });

    const result = editor.apply(course, { intent: "update-price", price });

    expect(result).toEqual({ error, status: 400 });
    expect(editor.getPage(course.id)?.course.price).toBe(500);
  });

  it("turns PPP on only for the string true", () => {
    const { editor, course } = setUp();

    expect(
      editor.apply(course, { intent: "update-ppp-enabled", pppEnabled: "true" })
    ).toEqual({ success: true, field: "ppp-enabled" });
    expect(editor.getPage(course.id)?.course.pppEnabled).toBe(true);

    editor.apply(course, { intent: "update-ppp-enabled", pppEnabled: "yes" });
    expect(editor.getPage(course.id)?.course.pppEnabled).toBe(false);
  });

  it("saves the sales copy", () => {
    const { editor, course } = setUp();

    const result = editor.apply(course, {
      intent: "update-sales-copy",
      salesCopy: "# Buy it",
    });

    expect(result).toEqual({ success: true, field: "sales-copy" });
    expect(editor.getPage(course.id)?.course.salesCopy).toContain("# Buy it");
  });
});

describe("courseEditorActionSchema", () => {
  it("trims titles and refuses an empty one", () => {
    expect(
      courseEditorActionSchema.safeParse({
        intent: "update-title",
        title: "  A  ",
      }).data
    ).toEqual({ intent: "update-title", title: "A" });
    expect(
      courseEditorActionSchema.safeParse({
        intent: "update-title",
        title: "   ",
      }).success
    ).toBe(false);
  });

  it("coerces ids from form strings", () => {
    expect(
      courseEditorActionSchema.safeParse({
        intent: "delete-lesson",
        lessonId: "7",
      }).data
    ).toEqual({ intent: "delete-lesson", lessonId: 7 });
  });

  it("refuses an unknown intent", () => {
    expect(
      courseEditorActionSchema.safeParse({ intent: "explode" }).success
    ).toBe(false);
  });
});
