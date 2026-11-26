import { QuestionType } from "~/db/schema";
import type { WizardQuestion } from "~/modules/quiz-editor";

/** A question's number, text and type, above its options. */
export function QuizQuestionHeading({
  question: q,
  index: idx,
  className,
}: {
  question: WizardQuestion;
  index: number;
  className: string;
}) {
  return (
    <div className={`${className} flex items-center gap-2`}>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {idx + 1}
      </span>
      <span className="font-medium">{q.text || "(No question text)"}</span>
      <span className="ml-auto text-xs text-muted-foreground">
        {q.type === QuestionType.TrueFalse ? "True/False" : "Multiple Choice"}
      </span>
    </div>
  );
}
