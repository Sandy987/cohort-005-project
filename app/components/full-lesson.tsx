import { useEffect } from "react";
import { Link, useFetcher, useNavigate } from "react-router";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Github,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { BookmarkToggle } from "~/components/bookmark-toggle";
import { CommentThread } from "~/components/comment-thread";
import { LessonLayout } from "~/components/lesson-layout";
import { LessonNote } from "~/components/lesson-note";
import { QuizSection } from "~/components/quiz-section";
import { useAutoplay } from "~/components/use-autoplay";
import { YouTubePlayer } from "~/components/youtube-player";
import { LessonProgressStatus } from "~/db/schema";
import type { FullLessonData } from "~/modules/lesson-page";
import { formatDuration } from "~/lib/utils";

type NeighbourLesson = FullLessonData["nextLesson"];

export function FullLesson({ data }: { data: FullLessonData }) {
  const { course, lesson, enrolled, currentUserId, nextLesson } = data;
  const canTake = enrolled && !!currentUserId;

  return (
    <LessonLayout
      outline={data}
      lesson={lesson}
      lessonProgressMap={data.lessonProgressMap}
      enrolled={enrolled}
    >
      <LessonHeader data={data} />
      <LessonBody data={data} />

      {data.quiz && canTake && (
        <LessonQuiz
          lessonId={lesson.id}
          quiz={data.quiz}
          bestAttempt={data.bestAttempt}
        />
      )}

      {canTake && (
        <CompletionControls
          lessonId={lesson.id}
          courseSlug={course.slug}
          lessonStatus={data.lessonStatus}
          nextLesson={nextLesson}
        />
      )}

      {/* Questions & Discussion — confidential to people with access */}
      <CommentThread
        comments={data.comments}
        currentUserId={currentUserId}
        canModerate={data.canModerate}
        canPost
        instructorName={data.instructorName}
      />

      <LessonPager
        course={course}
        prevLesson={data.prevLesson}
        nextLesson={nextLesson}
      />
    </LessonLayout>
  );
}

function LessonHeader({ data }: { data: FullLessonData }) {
  const { lesson, currentUserId, bookmarked } = data;
  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">{lesson.title}</h1>
        {currentUserId && <BookmarkToggle bookmarked={bookmarked} />}
      </div>
      <div className="mb-6 flex items-center gap-3">
        {lesson.durationMinutes && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="size-4" />
            {formatDuration(lesson.durationMinutes, true, false, false)}
          </div>
        )}
        {lesson.githubRepoUrl && (
          <a
            href={lesson.githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <Github className="mr-1.5 size-4" />
              Open Code
            </Button>
          </a>
        )}
      </div>
    </>
  );
}

function LessonBody({ data }: { data: FullLessonData }) {
  const { lesson, contentHtml, currentUserId, enrolled } = data;
  const [autoplay, toggleAutoplay] = useAutoplay();

  return (
    <>
      {lesson.videoUrl && (
        <YouTubePlayer
          videoUrl={lesson.videoUrl}
          lessonId={lesson.id}
          title={lesson.title}
          startPosition={data.lastWatchPosition}
          durationMinutes={lesson.durationMinutes}
          watchProgress={data.watchProgress}
          trackingEnabled={enrolled && !!currentUserId}
          autoplay={autoplay}
          onToggleAutoplay={toggleAutoplay}
        />
      )}

      {/* Note — under the video, so the Student can write while they watch */}
      {currentUserId && <LessonNote key={lesson.id} note={data.note} />}

      {contentHtml && (
        <div
          className="prose prose-neutral dark:prose-invert mb-8 max-w-none"
          // oxlint-disable-next-line react/no-danger -- the instructor wrote this Markdown
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}

      {!contentHtml && !lesson.videoUrl && (
        <Card className="mb-8">
          <CardContent className="py-12 text-center text-muted-foreground">
            No content has been added to this lesson yet.
          </CardContent>
        </Card>
      )}
    </>
  );
}

function LessonQuiz({
  lessonId,
  quiz,
  bestAttempt,
}: {
  lessonId: number;
  quiz: NonNullable<FullLessonData["quiz"]>;
  bestAttempt: FullLessonData["bestAttempt"];
}) {
  const quizFetcher = useFetcher({ key: `quiz-${lessonId}` });
  return (
    <QuizSection
      quiz={quiz}
      bestAttempt={bestAttempt}
      quizResult={quizFetcher.data?.quizResult ?? null}
      quizFetcher={quizFetcher}
      isSubmitting={quizFetcher.state !== "idle"}
    />
  );
}

type CompletionControlsProps = {
  lessonId: number;
  courseSlug: string;
  lessonStatus: string | null;
  nextLesson: NeighbourLesson;
};

/** After marking complete, go on to the next lesson. */
function useAdvanceOnComplete(
  justCompleted: boolean | undefined,
  courseSlug: string,
  nextLesson: NeighbourLesson
) {
  const navigate = useNavigate();
  useEffect(() => {
    if (justCompleted && nextLesson) {
      navigate(`/courses/${courseSlug}/lessons/${nextLesson.id}`);
    }
  }, [justCompleted, nextLesson, courseSlug, navigate]);
}

function CompletionControls({
  lessonId,
  courseSlug,
  lessonStatus,
  nextLesson,
}: CompletionControlsProps) {
  const fetcher = useFetcher({ key: `mark-complete-${lessonId}` });

  const isMarking =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "mark-complete";
  const justCompleted = fetcher.data?.success;
  const isCompleted =
    lessonStatus === LessonProgressStatus.Completed || justCompleted;

  useAdvanceOnComplete(justCompleted, courseSlug, nextLesson);

  if (isCompleted) {
    return (
      <div className="mb-8">
        <LessonCompleted courseSlug={courseSlug} nextLesson={nextLesson} />
      </div>
    );
  }

  return (
    <div className="mb-8">
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="mark-complete" />
        {nextLesson ? (
          <Button disabled={isMarking}>
            {isMarking ? (
              "Completing..."
            ) : (
              <>
                Up next: {nextLesson.title}
                <ChevronRight className="ml-1 size-4" />
              </>
            )}
          </Button>
        ) : (
          <Button disabled={isMarking}>
            <CheckCircle2 className="mr-2 size-4" />
            {isMarking ? "Marking..." : "Mark as Complete"}
          </Button>
        )}
      </fetcher.Form>
    </div>
  );
}

function LessonCompleted({
  courseSlug,
  nextLesson,
}: {
  courseSlug: string;
  nextLesson: NeighbourLesson;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="size-5" />
        <span className="font-medium">Lesson completed</span>
      </div>
      {nextLesson && (
        <Link to={`/courses/${courseSlug}/lessons/${nextLesson.id}`}>
          <Button variant="outline" size="sm">
            Up next: {nextLesson.title}
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}

function LessonPager({
  course,
  prevLesson,
  nextLesson,
}: {
  course: { title: string; slug: string };
  prevLesson: NeighbourLesson;
  nextLesson: NeighbourLesson;
}) {
  return (
    <div className="flex items-center justify-between border-t pt-6">
      {prevLesson ? (
        <Link
          to={`/courses/${course.slug}/lessons/${prevLesson.id}`}
          className="flex items-center gap-2 text-sm hover:text-foreground text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          <PagerLabel label="Previous" title={prevLesson.title} />
        </Link>
      ) : (
        <div />
      )}

      {nextLesson ? (
        <Link
          to={`/courses/${course.slug}/lessons/${nextLesson.id}`}
          className="flex items-center gap-2 text-right text-sm hover:text-foreground text-muted-foreground"
        >
          <PagerLabel label="Next" title={nextLesson.title} />
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <Link
          to={`/courses/${course.slug}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <PagerLabel label="Back to" title={course.title} />
          <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function PagerLabel({ label, title }: { label: string; title: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{title}</div>
    </div>
  );
}
