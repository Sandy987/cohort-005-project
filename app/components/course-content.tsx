import { Link } from "react-router";
import { CheckCircle2, Circle, Clock, Pencil, PlayCircle } from "lucide-react";
import { LessonProgressStatus } from "~/db/schema";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { formatDuration } from "~/lib/utils";

type CourseContentLesson = {
  id: number;
  title: string;
  durationMinutes: number | null;
};

type CourseContentCourse = {
  id: number;
  slug: string;
  modules: Array<{
    id: number;
    title: string;
    lessons: Array<CourseContentLesson>;
  }>;
};

export function CourseContent({
  course,
  canView,
  isInstructor,
  lessonProgressMap,
}: {
  course: CourseContentCourse;
  canView: boolean;
  isInstructor: boolean;
  lessonProgressMap: Record<number, string>;
}) {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Course Content</h2>
      {course.modules.length === 0 ? (
        <p className="text-muted-foreground">
          No content has been added to this course yet.
        </p>
      ) : (
        <div className="space-y-4">
          {course.modules.map((mod) => (
            <ModuleCard
              key={mod.id}
              course={course}
              mod={mod}
              canView={canView}
              isInstructor={isInstructor}
              lessonProgressMap={lessonProgressMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleCard({
  course,
  mod,
  canView,
  isInstructor,
  lessonProgressMap,
}: {
  course: CourseContentCourse;
  mod: CourseContentCourse["modules"][number];
  canView: boolean;
  isInstructor: boolean;
  lessonProgressMap: Record<number, string>;
}) {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">
          <Link
            to={`/courses/${course.slug}/${mod.id}`}
            className="hover:underline"
          >
            {mod.title}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground">
          {mod.lessons.length} lessons
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {mod.lessons.map((lesson) => (
            <LessonItem
              key={lesson.id}
              course={course}
              lesson={lesson}
              status={lessonProgressMap[lesson.id]}
              canView={canView}
              isInstructor={isInstructor}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function LessonItem({
  course,
  lesson,
  status,
  canView,
  isInstructor,
}: {
  course: CourseContentCourse;
  lesson: CourseContentLesson;
  status: string | undefined;
  canView: boolean;
  isInstructor: boolean;
}) {
  if (isInstructor) {
    return (
      <li>
        <Link
          to={`/instructor/${course.id}/lessons/${lesson.id}`}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
        >
          <Pencil className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1">{lesson.title}</span>
          <LessonDuration minutes={lesson.durationMinutes} />
        </Link>
      </li>
    );
  }

  return (
    <li>
      {canView ? (
        <Link
          to={`/courses/${course.slug}/lessons/${lesson.id}`}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
        >
          <LessonStatusIcon status={status} />
          <span className="flex-1">{lesson.title}</span>
          <LessonDuration minutes={lesson.durationMinutes} />
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2 text-sm">
          <Circle className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1">{lesson.title}</span>
          <LessonDuration minutes={lesson.durationMinutes} />
        </div>
      )}
    </li>
  );
}

function LessonDuration({ minutes }: { minutes: number | null }) {
  return (
    minutes && (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="size-3" />
        {formatDuration(minutes, true, false, false)}
      </span>
    )
  );
}

function LessonStatusIcon({ status }: { status: string | undefined }) {
  const isCompleted = status === LessonProgressStatus.Completed;
  const isLessonInProgress = status === LessonProgressStatus.InProgress;

  return isCompleted ? (
    <CheckCircle2 className="size-4 shrink-0 text-green-500" />
  ) : isLessonInProgress ? (
    <PlayCircle className="size-4 shrink-0 text-blue-500" />
  ) : (
    <Circle className="size-4 shrink-0 text-muted-foreground" />
  );
}
