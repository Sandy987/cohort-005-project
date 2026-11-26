import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { CheckCircle2, ChevronDown, Circle, PlayCircle } from "lucide-react";
import { LessonProgressStatus } from "~/db/schema";
import { cn } from "~/lib/utils";

type CurriculumSidebarProps = {
  course: { id: number; title: string; slug: string };
  curriculum: Array<{
    id: number;
    title: string;
    lessons: Array<{ id: number; title: string }>;
  }>;
  currentLessonId: number;
  lessonProgressMap: Record<number, string>;
  enrolled: boolean;
};

export function CurriculumSidebar({
  course,
  curriculum,
  currentLessonId,
  lessonProgressMap,
  enrolled,
}: CurriculumSidebarProps) {
  const [expandedModules, toggleModule] = useExpandedModules(
    curriculum,
    currentLessonId
  );

  return (
    <aside className="hidden w-72 shrink-0 border-r border-border lg:block">
      <div className="sticky top-0 flex h-screen flex-col overflow-y-auto">
        <div className="border-b border-border p-4">
          <Link
            to={`/courses/${course.slug}`}
            className="text-sm font-semibold hover:text-primary"
          >
            {course.title}
          </Link>
        </div>

        <nav className="flex-1 p-2">
          {curriculum.map((mod) => (
            <ModuleSection
              key={mod.id}
              mod={mod}
              isExpanded={expandedModules.has(mod.id)}
              onToggle={() => toggleModule(mod.id)}
            >
              {mod.lessons.map((l) => (
                <LessonLink
                  key={l.id}
                  courseSlug={course.slug}
                  lesson={l}
                  isCurrent={l.id === currentLessonId}
                  status={enrolled ? lessonProgressMap[l.id] : undefined}
                />
              ))}
            </ModuleSection>
          ))}
        </nav>
      </div>
    </aside>
  );
}

/** Starts with the current lesson's module open. */
function useExpandedModules(
  curriculum: Array<{ id: number; lessons: Array<{ id: number }> }>,
  currentLessonId: number
) {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(() => {
    const currentModuleId = curriculum.find((m) =>
      m.lessons.some((l) => l.id === currentLessonId)
    )?.id;
    const initial = new Set<number>();
    if (currentModuleId) initial.add(currentModuleId);
    return initial;
  });

  function toggleModule(moduleId: number) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }

  return [expandedModules, toggleModule] as const;
}

function ModuleSection({
  mod,
  isExpanded,
  onToggle,
  children,
}: {
  mod: { title: string };
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform",
            !isExpanded && "-rotate-90"
          )}
        />
        <span className="flex-1 text-left">{mod.title}</span>
      </button>

      {isExpanded && <ul className="ml-4 space-y-0.5 py-1">{children}</ul>}
    </div>
  );
}

/** `status` is undefined for someone not enrolled: they see no progress. */
function LessonLink({
  courseSlug,
  lesson,
  isCurrent,
  status,
}: {
  courseSlug: string;
  lesson: { id: number; title: string };
  isCurrent: boolean;
  status: string | undefined;
}) {
  return (
    <li>
      <Link
        to={`/courses/${courseSlug}/lessons/${lesson.id}`}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
          isCurrent
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <LessonStatusIcon status={status} />
        <span className="truncate">{lesson.title}</span>
      </Link>
    </li>
  );
}

function LessonStatusIcon({ status }: { status: string | undefined }) {
  if (status === LessonProgressStatus.Completed) {
    return <CheckCircle2 className="size-3.5 shrink-0 text-green-500" />;
  }
  if (status === LessonProgressStatus.InProgress) {
    return <PlayCircle className="size-3.5 shrink-0 text-blue-500" />;
  }
  return <Circle className="size-3.5 shrink-0" />;
}
