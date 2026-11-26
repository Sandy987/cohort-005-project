import { useState } from "react";
import { Link, useFetcher, useNavigate } from "react-router";
import { toast } from "sonner";
import type { Route } from "./+types/instructor.$courseId.lessons.$lessonId.quiz";
import { coursePermissions } from "~/modules/permissions/course-permissions.server";
import {
  parseWizardData,
  quizActionSchema,
  quizEditor,
} from "~/modules/quiz-editor/index.server";
import {
  canGoNext,
  initialWizard,
  type WizardState,
} from "~/modules/quiz-editor";
import { Button } from "~/components/ui/button";
import { QuizStepIndicator } from "~/components/quiz-step-indicator";
import { QuizSettingsStep } from "~/components/quiz-settings-step";
import { QuizQuestionsStep } from "~/components/quiz-questions-step";
import { QuizAnswersStep } from "~/components/quiz-answers-step";
import { QuizReviewStep } from "~/components/quiz-review-step";
import { QuizEditorError } from "~/components/quiz-editor-error";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { data } from "react-router";
import { parseFormData } from "~/lib/validation";

// ─── Meta ───

export function meta({ loaderData }: Route.MetaArgs) {
  const lessonTitle = loaderData?.lesson?.title ?? "Lesson";
  const hasQuiz = !!loaderData?.existingQuiz;
  return [
    {
      title: `${hasQuiz ? "Edit" : "Create"} Quiz: ${lessonTitle} — Cadence`,
    },
  ];
}

// ─── Loader ───

export async function loader({ params, request }: Route.LoaderArgs) {
  const { course } = await coursePermissions.requireCapability(
    request,
    "manage",
    { courseId: params.courseId, lessonId: params.lessonId }
  );
  // requireCapability has checked this is a lesson in the course.
  const editorData = quizEditor.getEditorData(Number(params.lessonId));
  if (!editorData) {
    throw data("Lesson not found.", { status: 404 });
  }

  return { course, ...editorData };
}

// ─── Action ───

export async function action({ params, request }: Route.ActionArgs) {
  await coursePermissions.requireCapability(request, "manage", {
    courseId: params.courseId,
    lessonId: params.lessonId,
  });
  // requireCapability has checked this is a lesson in the course.
  const lessonId = Number(params.lessonId);

  const formData = await request.formData();
  const parsed = parseFormData(formData, quizActionSchema);

  if (!parsed.success) {
    return data(
      { error: Object.values(parsed.errors)[0] ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { intent } = parsed.data;

  if (intent === "save-quiz") {
    const wizardData = parseWizardData(parsed.data.wizardData);
    if (!wizardData) {
      return data({ error: "Invalid quiz data." }, { status: 400 });
    }

    quizEditor.saveQuiz(lessonId, wizardData);
    return { success: true };
  }

  if (intent === "delete-quiz") {
    quizEditor.deleteQuiz(lessonId);
    return { success: true, deleted: true };
  }

  throw data("Invalid action.", { status: 400 });
}

// ─── Component ───

export default function QuizBuilderWizard({
  loaderData,
}: Route.ComponentProps) {
  const { course, lesson, existingQuiz } = loaderData;
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Initialize wizard state from existing quiz or defaults
  const [wizard, setWizard] = useState<WizardState>(() =>
    initialWizard(existingQuiz)
  );

  const isEditing = !!existingQuiz;

  // Toast on success
  const fetcherData = fetcher.data as
    | { success?: boolean; deleted?: boolean; error?: string }
    | undefined;

  if (fetcher.state === "idle" && fetcherData?.success) {
    if (fetcherData.deleted) {
      toast.success("Quiz deleted.");
      navigate(`/instructor/${course.id}/lessons/${lesson.id}`);
    } else {
      toast.success("Quiz saved.");
      navigate(`/instructor/${course.id}/lessons/${lesson.id}`);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/instructor" className="hover:text-foreground">
          My Courses
        </Link>
        <span className="mx-2">/</span>
        <Link to={`/instructor/${course.id}`} className="hover:text-foreground">
          {course.title}
        </Link>
        <span className="mx-2">/</span>
        <Link
          to={`/instructor/${course.id}/lessons/${lesson.id}`}
          className="hover:text-foreground"
        >
          {lesson.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">
          {isEditing ? "Edit Quiz" : "Create Quiz"}
        </span>
      </nav>

      <Link
        to={`/instructor/${course.id}/lessons/${lesson.id}`}
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to Lesson Editor
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? "Edit Quiz" : "Create Quiz"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lesson: {lesson.title}
          </p>
        </div>
        {isEditing && (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (
                confirm(
                  "Are you sure you want to delete this quiz? All student attempts will be lost."
                )
              ) {
                fetcher.submit({ intent: "delete-quiz" }, { method: "post" });
              }
            }}
          >
            <Trash2 className="mr-1.5 size-4" />
            Delete Quiz
          </Button>
        )}
      </div>

      {/* Step indicator */}
      <QuizStepIndicator currentStep={step} onStepClick={setStep} />

      {/* Step content */}
      {step === 1 && <QuizSettingsStep wizard={wizard} setWizard={setWizard} />}
      {step === 2 && (
        <QuizQuestionsStep wizard={wizard} setWizard={setWizard} />
      )}
      {step === 3 && <QuizAnswersStep wizard={wizard} setWizard={setWizard} />}
      {step === 4 && (
        <QuizReviewStep
          wizard={wizard}
          isEditing={isEditing}
          saving={fetcher.state !== "idle"}
          error={fetcherData?.error}
          onSave={() => {
            fetcher.submit(
              {
                intent: "save-quiz",
                wizardData: JSON.stringify(wizard),
              },
              { method: "post" }
            );
          }}
        />
      )}

      {/* Step navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Previous
        </Button>
        {step < 4 && (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext(step, wizard)}
          >
            Next
            <ArrowRight className="ml-1.5 size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <QuizEditorError error={error} />;
}
