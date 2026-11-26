import { Link } from "react-router";
import { MapPin, ShieldAlert } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { LessonLayout } from "~/components/lesson-layout";
import type { LockedLessonData } from "~/modules/lesson-page";
import { countryName } from "~/lib/ppp";

type LockedReason = LockedLessonData["lockedReason"];

export function LockedLesson({ data }: { data: LockedLessonData }) {
  const { course, lesson, enrolled, lockedReason } = data;

  return (
    <LessonLayout
      outline={data}
      lesson={lesson}
      lessonProgressMap={{}}
      enrolled={enrolled}
    >
      <h1 className="mb-6 text-3xl font-bold">{lesson.title}</h1>

      <Card className="mb-8">
        <CardContent className="py-10 text-center">
          {lockedReason.kind === "country-lock" ? (
            <CountryLockNotice
              courseSlug={course.slug}
              lockedReason={lockedReason}
            />
          ) : (
            <BuyCourseNotice course={course} lockedReason={lockedReason} />
          )}
        </CardContent>
      </Card>
    </LessonLayout>
  );
}

function CountryLockNotice({
  courseSlug,
  lockedReason,
}: {
  courseSlug: string;
  lockedReason: Extract<LockedReason, { kind: "country-lock" }>;
}) {
  return (
    <>
      <ShieldAlert className="mx-auto mb-4 size-12 text-amber-500" />
      <h2 className="mb-3 text-xl font-semibold">Country Lock</h2>
      <p className="mb-4 text-muted-foreground">
        You bought this course at a Purchasing-Power Price in{" "}
        <strong>{countryName(lockedReason.purchaseCountry)}</strong>, but you're
        currently in <strong>{countryName(lockedReason.currentCountry)}</strong>
        .
      </p>
      <p className="mb-6 text-sm text-muted-foreground">
        A course bought at a Purchasing-Power Price only works from the country
        it was bought in. This helps keep courses affordable for students in
        lower-income regions.
      </p>
      <Link to={`/courses/${courseSlug}`}>
        <Button variant="outline">
          <MapPin className="mr-2 size-4" />
          Back to Course
        </Button>
      </Link>
    </>
  );
}

function BuyCourseNotice({
  course,
  lockedReason,
}: {
  course: { title: string; slug: string };
  lockedReason: LockedReason;
}) {
  const purchasePath = `/courses/${course.slug}/purchase`;
  return (
    <>
      <h2 className="mb-3 text-xl font-semibold">
        Buy this course to watch this lesson
      </h2>
      <p className="mb-6 text-muted-foreground">
        This lesson is part of <strong>{course.title}</strong>. Enroll to get
        the full lesson, its video and every other lesson in the course.
      </p>
      <Link
        to={
          lockedReason.kind === "signed-out"
            ? `/signup?redirectTo=${encodeURIComponent(purchasePath)}`
            : purchasePath
        }
      >
        <Button size="lg">Buy the course</Button>
      </Link>
    </>
  );
}
