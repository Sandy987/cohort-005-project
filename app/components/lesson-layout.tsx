import type { ReactNode } from "react";
import { CurriculumSidebar } from "~/components/curriculum-sidebar";
import { LessonBreadcrumb } from "~/components/lesson-breadcrumb";

/** The curriculum sidebar and breadcrumb every Lesson page view sits inside. */
export function LessonLayout({
  outline: { course, curriculum, module: mod },
  lesson,
  lessonProgressMap,
  enrolled,
  children,
}: {
  outline: {
    course: { id: number; title: string; slug: string };
    curriculum: Array<{
      id: number;
      title: string;
      lessons: Array<{ id: number; title: string }>;
    }>;
    module: { id: number; title: string };
  };
  lesson: { id: number; title: string };
  lessonProgressMap: Record<number, string>;
  enrolled: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex">
      <CurriculumSidebar
        course={course}
        curriculum={curriculum}
        currentLessonId={lesson.id}
        lessonProgressMap={lessonProgressMap}
        enrolled={enrolled}
      />

      <div className="flex-1 p-6 lg:p-8">
        <LessonBreadcrumb
          course={course}
          mod={mod}
          lessonTitle={lesson.title}
        />

        <div className="mx-auto max-w-4xl">{children}</div>
      </div>
    </div>
  );
}
