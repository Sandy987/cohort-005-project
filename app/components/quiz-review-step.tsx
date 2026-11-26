import { CheckCircle2, Save, XCircle } from "lucide-react";
import {
  getValidationErrors,
  type WizardQuestion,
  type WizardState,
} from "~/modules/quiz-editor";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { QuizQuestionHeading } from "~/components/quiz-question-heading";

export function QuizReviewStep({
  wizard,
  isEditing,
  saving,
  error,
  onSave,
}: {
  wizard: WizardState;
  isEditing: boolean;
  saving: boolean;
  error: string | undefined;
  onSave: () => void;
}) {
  const validationErrors = getValidationErrors(wizard);
  const isValid = validationErrors.length === 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Review Quiz</h2>
          <p className="text-sm text-muted-foreground">
            Review your quiz before saving.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReviewSummary wizard={wizard} />

          {wizard.questions.map((q, idx) => (
            <ReviewQuestion key={q.id} question={q} index={idx} />
          ))}

          {validationErrors.length > 0 && (
            <ValidationErrors errors={validationErrors} />
          )}

          {/* Save button */}
          <div className="flex items-center gap-3">
            <Button disabled={!isValid || saving} onClick={onSave}>
              <Save className="mr-1.5 size-4" />
              {saving ? "Saving..." : isEditing ? "Update Quiz" : "Create Quiz"}
            </Button>

            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewSummary({ wizard }: { wizard: WizardState }) {
  return (
    <div className="rounded-lg bg-muted/50 p-4">
      <div className="space-y-1 text-sm">
        <div>
          <span className="font-medium">Title:</span>{" "}
          {wizard.title || "(empty)"}
        </div>
        <div>
          <span className="font-medium">Passing Score:</span>{" "}
          {wizard.passingScore}%
        </div>
        <div>
          <span className="font-medium">Questions:</span>{" "}
          {wizard.questions.length}
        </div>
      </div>
    </div>
  );
}

function ReviewQuestion({
  question: q,
  index: idx,
}: {
  question: WizardQuestion;
  index: number;
}) {
  return (
    <div className="rounded-lg border p-4">
      <QuizQuestionHeading question={q} index={idx} className="mb-2" />
      <div className="ml-8 space-y-1">
        {q.options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2 text-sm">
            {opt.isCorrect ? (
              <CheckCircle2 className="size-4 text-green-500" />
            ) : (
              <XCircle className="size-4 text-muted-foreground/40" />
            )}
            <span className={opt.isCorrect ? "font-medium text-green-700" : ""}>
              {opt.text || "(empty)"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValidationErrors({ errors }: { errors: string[] }) {
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
      <p className="mb-2 text-sm font-medium text-destructive">
        Please fix these issues before saving:
      </p>
      <ul className="list-inside list-disc space-y-1 text-sm text-destructive">
        {errors.map((validationError, i) => (
          // oxlint-disable-next-line react/no-array-index-key -- messages can repeat, and the list is rebuilt on every render
          <li key={i}>{validationError}</li>
        ))}
      </ul>
    </div>
  );
}
