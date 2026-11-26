import type { Dispatch, SetStateAction } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { QuestionType } from "~/db/schema";
import {
  addOption,
  removeOption,
  setCorrectOption,
  updateOption,
  type WizardOption,
  type WizardQuestion,
  type WizardState,
} from "~/modules/quiz-editor";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { QuizQuestionHeading } from "~/components/quiz-question-heading";

type SetWizard = Dispatch<SetStateAction<WizardState>>;

export function QuizAnswersStep({
  wizard,
  setWizard,
}: {
  wizard: WizardState;
  setWizard: SetWizard;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Answer Options</h2>
          <p className="text-sm text-muted-foreground">
            Set answer options for each question and mark the correct answer.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {wizard.questions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Go back and add questions first.
            </p>
          )}

          {wizard.questions.map((q, idx) => (
            <AnswerQuestion
              key={q.id}
              question={q}
              index={idx}
              setWizard={setWizard}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AnswerQuestion({
  question: q,
  index: idx,
  setWizard,
}: {
  question: WizardQuestion;
  index: number;
  setWizard: SetWizard;
}) {
  return (
    <div className="rounded-lg border p-4">
      <QuizQuestionHeading question={q} index={idx} className="mb-3" />

      <div className="space-y-2">
        {q.options.map((opt) => (
          <AnswerOption
            key={opt.id}
            question={q}
            option={opt}
            setWizard={setWizard}
          />
        ))}
      </div>

      {q.type === QuestionType.MultipleChoice && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWizard((prev) => addOption(prev, q.id))}
          className="mt-2"
        >
          <Plus className="mr-1 size-3" />
          Add Option
        </Button>
      )}
    </div>
  );
}

function AnswerOption({
  question: q,
  option: opt,
  setWizard,
}: {
  question: WizardQuestion;
  option: WizardOption;
  setWizard: SetWizard;
}) {
  const ref = { questionId: q.id, optionId: opt.id };
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setWizard((prev) => setCorrectOption(prev, ref))}
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          opt.isCorrect
            ? "border-green-500 bg-green-500 text-white"
            : "border-muted-foreground/30 hover:border-green-500/50"
        }`}
      >
        {opt.isCorrect && <Check className="size-3" />}
      </button>
      {q.type === QuestionType.TrueFalse ? (
        <span className="text-sm">{opt.text}</span>
      ) : (
        <Input
          value={opt.text}
          onChange={(event) =>
            setWizard((prev) =>
              updateOption(prev, ref, { text: event.target.value })
            )
          }
          placeholder="Enter option text..."
          className="flex-1"
        />
      )}
      {q.type === QuestionType.MultipleChoice && q.options.length > 2 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWizard((prev) => removeOption(prev, ref))}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-3" />
        </Button>
      )}
    </div>
  );
}
