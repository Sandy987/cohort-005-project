import { z } from "zod";
import { CourseStatus } from "~/db/schema";
import {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  moveLessonToModule,
  reorderLessons,
  reorderModules,
  updateCourse,
  updateCoursePppEnabled,
  updateCoursePrice,
  updateCourseSalesCopy,
  updateCourseStatus,
  updateLessonTitle,
  updateModuleTitle,
} from "./mutations";
import { getLessonById, getModuleById, type Db } from "./queries";

export const courseEditorActionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("update-title"),
    title: z.string().trim().min(1, "Title cannot be empty."),
  }),
  z.object({
    intent: z.literal("update-description"),
    description: z.string().trim().min(1, "Description cannot be empty."),
  }),
  z.object({
    intent: z.literal("update-status"),
    status: z.nativeEnum(CourseStatus),
  }),
  z.object({ intent: z.literal("update-price"), price: z.string() }),
  z.object({ intent: z.literal("update-ppp-enabled"), pppEnabled: z.string() }),
  z.object({
    intent: z.literal("add-module"),
    title: z.string().trim().min(1, "Module title cannot be empty."),
  }),
  z.object({
    intent: z.literal("rename-module"),
    moduleId: z.coerce.number().int(),
    title: z.string().trim().min(1, "Module title cannot be empty."),
  }),
  z.object({
    intent: z.literal("delete-module"),
    moduleId: z.coerce.number().int(),
  }),
  z.object({
    intent: z.literal("add-lesson"),
    moduleId: z.coerce.number().int(),
    title: z.string().trim().min(1, "Lesson title cannot be empty."),
  }),
  z.object({
    intent: z.literal("rename-lesson"),
    lessonId: z.coerce.number().int(),
    title: z.string().trim().min(1, "Lesson title cannot be empty."),
  }),
  z.object({
    intent: z.literal("reorder-modules"),
    moduleIds: z.string().min(1, "Missing module IDs."),
  }),
  z.object({
    intent: z.literal("reorder-lessons"),
    moduleId: z.coerce.number().int(),
    lessonIds: z.string().min(1, "Missing lesson IDs."),
  }),
  z.object({
    intent: z.literal("move-lesson"),
    lessonId: z.coerce.number().int(),
    targetModuleId: z.coerce.number().int(),
    targetPosition: z.coerce.number().int(),
  }),
  z.object({
    intent: z.literal("delete-lesson"),
    lessonId: z.coerce.number().int(),
  }),
  z.object({
    intent: z.literal("update-sales-copy"),
    salesCopy: z.string().trim().min(1, "Sales copy cannot be empty."),
  }),
]);

export type CourseEditorAction = z.infer<typeof courseEditorActionSchema>;

export type EditedCourse = { id: number; title: string; description: string };

export type CourseEditorActionResult =
  | { success: true; field: string }
  | { error: string; status: 400 | 404 };

function moduleNotFound(): CourseEditorActionResult {
  return { error: "Module not found in this course.", status: 404 };
}

function lessonNotFound(): CourseEditorActionResult {
  return { error: "Lesson not found.", status: 404 };
}

function lessonNotInCourse(): CourseEditorActionResult {
  return { error: "Lesson not found in this course.", status: 404 };
}

type ActionFor<Intent extends CourseEditorAction["intent"]> = Extract<
  CourseEditorAction,
  { intent: Intent }
>;

type CourseFieldAction = ActionFor<
  | "update-title"
  | "update-description"
  | "update-status"
  | "update-price"
  | "update-ppp-enabled"
  | "update-sales-copy"
>;

type ModuleAction = ActionFor<
  "add-module" | "rename-module" | "delete-module" | "reorder-modules"
>;

type LessonAction = Exclude<
  CourseEditorAction,
  CourseFieldAction | ModuleAction
>;

export function applyCourseEditorAction(
  db: Db,
  course: EditedCourse,
  input: CourseEditorAction
): CourseEditorActionResult {
  switch (input.intent) {
    case "update-title":
    case "update-description":
    case "update-status":
    case "update-price":
    case "update-ppp-enabled":
    case "update-sales-copy":
      return applyCourseFieldAction(db, course, input);
    case "add-module":
    case "rename-module":
    case "delete-module":
    case "reorder-modules":
      return applyModuleAction(db, course.id, input);
    default:
      return applyLessonAction(db, course.id, input);
  }
}

function applyCourseFieldAction(
  db: Db,
  course: EditedCourse,
  input: CourseFieldAction
): CourseEditorActionResult {
  const courseId = course.id;
  switch (input.intent) {
    case "update-title":
      updateCourse(db, courseId, input.title, course.description);
      return { success: true, field: "title" };

    case "update-description":
      updateCourse(db, courseId, course.title, input.description);
      return { success: true, field: "description" };

    case "update-status":
      updateCourseStatus(db, courseId, input.status);
      return { success: true, field: "status" };

    case "update-price": {
      const priceDollars = parseFloat(input.price);
      if (isNaN(priceDollars) || priceDollars < 0) {
        return { error: "Price must be a non-negative number.", status: 400 };
      }
      if (priceDollars > 9999.99) {
        return { error: "Price cannot exceed $9,999.99.", status: 400 };
      }
      const priceCents = Math.round(priceDollars * 100);
      updateCoursePrice(db, courseId, priceCents);
      return { success: true, field: "price" };
    }

    case "update-ppp-enabled": {
      const pppEnabled = input.pppEnabled === "true";
      updateCoursePppEnabled(db, courseId, pppEnabled);
      return { success: true, field: "ppp-enabled" };
    }

    case "update-sales-copy":
      updateCourseSalesCopy(db, courseId, input.salesCopy);
      return { success: true, field: "sales-copy" };
  }
}

function isModuleInCourse(db: Db, moduleId: number, courseId: number) {
  return getModuleById(db, moduleId)?.courseId === courseId;
}

function applyModuleAction(
  db: Db,
  courseId: number,
  input: ModuleAction
): CourseEditorActionResult {
  switch (input.intent) {
    case "add-module":
      createModule(db, courseId, input.title, null);
      return { success: true, field: "module" };

    case "rename-module":
      if (!isModuleInCourse(db, input.moduleId, courseId)) {
        return moduleNotFound();
      }
      updateModuleTitle(db, input.moduleId, input.title);
      return { success: true, field: "module" };

    case "delete-module":
      if (!isModuleInCourse(db, input.moduleId, courseId)) {
        return moduleNotFound();
      }
      deleteModule(db, input.moduleId);
      return { success: true, field: "module" };

    case "reorder-modules": {
      const moduleIds: number[] = JSON.parse(input.moduleIds);
      reorderModules(db, courseId, moduleIds);
      return { success: true, field: "module-reorder" };
    }
  }
}

function applyLessonAction(
  db: Db,
  courseId: number,
  input: LessonAction
): CourseEditorActionResult {
  const isInCourse = (moduleId: number) =>
    isModuleInCourse(db, moduleId, courseId);

  if (input.intent === "add-lesson" || input.intent === "reorder-lessons") {
    if (!isInCourse(input.moduleId)) return moduleNotFound();
    if (input.intent === "add-lesson") {
      createLesson(db, input.moduleId, input.title, null, null, null, null);
      return { success: true, field: "lesson" };
    }
    const lessonIds: number[] = JSON.parse(input.lessonIds);
    reorderLessons(db, input.moduleId, lessonIds);
    return { success: true, field: "lesson-reorder" };
  }

  const lesson = getLessonById(db, input.lessonId);
  if (!lesson) return lessonNotFound();
  if (!isInCourse(lesson.moduleId)) return lessonNotInCourse();

  switch (input.intent) {
    case "rename-lesson":
      updateLessonTitle(db, input.lessonId, input.title);
      return { success: true, field: "lesson" };

    case "delete-lesson":
      deleteLesson(db, input.lessonId);
      return { success: true, field: "lesson" };

    case "move-lesson": {
      const { lessonId, targetModuleId, targetPosition } = input;
      if (!isInCourse(targetModuleId)) {
        return {
          error: "Target module not found in this course.",
          status: 404,
        };
      }
      moveLessonToModule(db, lessonId, targetModuleId, targetPosition);
      return { success: true, field: "lesson-move" };
    }
  }
}
