import { describe, it, expect } from "vitest";
import { planDrop } from "../index";

const modules = [
  { id: 1, lessons: [{ id: 10 }, { id: 11 }, { id: 12 }] },
  { id: 2, lessons: [{ id: 20 }] },
  { id: 3, lessons: [] },
];

const at = (droppableId: string, index: number) => ({ droppableId, index });

describe("planDrop", () => {
  it("saves nothing when dropped outside a list", () => {
    expect(
      planDrop(
        { type: "module", source: at("modules", 0), destination: null },
        modules
      )
    ).toBeNull();
  });

  it("saves nothing when dropped back where it started", () => {
    expect(
      planDrop(
        {
          type: "lesson",
          source: at("lessons-1", 1),
          destination: at("lessons-1", 1),
        },
        modules
      )
    ).toBeNull();
  });

  it("reorders modules", () => {
    expect(
      planDrop(
        {
          type: "module",
          source: at("modules", 0),
          destination: at("modules", 2),
        },
        modules
      )
    ).toEqual({ intent: "reorder-modules", moduleIds: "[2,3,1]" });
  });

  it("reorders lessons within one module", () => {
    expect(
      planDrop(
        {
          type: "lesson",
          source: at("lessons-1", 2),
          destination: at("lessons-1", 0),
        },
        modules
      )
    ).toEqual({
      intent: "reorder-lessons",
      moduleId: "1",
      lessonIds: "[12,10,11]",
    });
  });

  it("moves a lesson to another module at a 1-based position", () => {
    expect(
      planDrop(
        {
          type: "lesson",
          source: at("lessons-1", 1),
          destination: at("lessons-2", 1),
        },
        modules
      )
    ).toEqual({
      intent: "move-lesson",
      lessonId: "11",
      targetModuleId: "2",
      targetPosition: "2",
    });
  });

  it("saves nothing for a module or lesson it doesn't know", () => {
    expect(
      planDrop(
        {
          type: "lesson",
          source: at("lessons-9", 0),
          destination: at("lessons-9", 1),
        },
        modules
      )
    ).toBeNull();
    expect(
      planDrop(
        {
          type: "lesson",
          source: at("lessons-9", 0),
          destination: at("lessons-2", 0),
        },
        modules
      )
    ).toBeNull();
    expect(
      planDrop(
        {
          type: "lesson",
          source: at("lessons-3", 0),
          destination: at("lessons-2", 0),
        },
        modules
      )
    ).toBeNull();
  });

  it("saves nothing for a drop type it doesn't know", () => {
    expect(
      planDrop(
        { type: "other", source: at("a", 0), destination: at("b", 0) },
        modules
      )
    ).toBeNull();
  });
});
