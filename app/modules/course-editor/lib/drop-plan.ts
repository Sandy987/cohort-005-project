/** The parts of a drag-and-drop result that decide what to save. */
export type Drop = {
  type: string;
  source: { droppableId: string; index: number };
  destination?: { droppableId: string; index: number } | null;
};

export type DropModule = { id: number; lessons: { id: number }[] };

export type DropSubmission =
  | { intent: "reorder-modules"; moduleIds: string }
  | { intent: "reorder-lessons"; moduleId: string; lessonIds: string }
  | {
      intent: "move-lesson";
      lessonId: string;
      targetModuleId: string;
      targetPosition: string;
    };

type Destination = NonNullable<Drop["destination"]>;

export function planDrop(
  result: Drop,
  modules: DropModule[]
): DropSubmission | null {
  const { destination } = result;
  if (!destination) return null;
  if (
    result.source.droppableId === destination.droppableId &&
    result.source.index === destination.index
  ) {
    return null;
  }

  if (result.type === "module") {
    const reordered = Array.from(modules);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(destination.index, 0, moved);

    const moduleIds = reordered.map((m) => m.id);
    return { intent: "reorder-modules", moduleIds: JSON.stringify(moduleIds) };
  }

  if (result.type === "lesson") {
    return planLessonDrop(result.source, destination, modules);
  }

  return null;
}

function planLessonDrop(
  source: Drop["source"],
  destination: Destination,
  modules: DropModule[]
): DropSubmission | null {
  const sourceModuleId = parseInt(
    source.droppableId.replace("lessons-", ""),
    10
  );
  const destModuleId = parseInt(
    destination.droppableId.replace("lessons-", ""),
    10
  );

  if (sourceModuleId === destModuleId) {
    // Reorder within the same module
    const mod = modules.find((m) => m.id === sourceModuleId);
    if (!mod) return null;

    const reordered = Array.from(mod.lessons);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);

    const lessonIds = reordered.map((l) => l.id);
    return {
      intent: "reorder-lessons",
      moduleId: String(sourceModuleId),
      lessonIds: JSON.stringify(lessonIds),
    };
  }

  // Move lesson to a different module
  const sourceMod = modules.find((m) => m.id === sourceModuleId);
  if (!sourceMod) return null;

  const lesson = sourceMod.lessons[source.index];
  if (!lesson) return null;

  // Target position is 1-based (destination index + 1)
  const targetPosition = destination.index + 1;

  return {
    intent: "move-lesson",
    lessonId: String(lesson.id),
    targetModuleId: String(destModuleId),
    targetPosition: String(targetPosition),
  };
}
