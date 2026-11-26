import type { Dispatch, SetStateAction } from "react";
import { QuestionType } from "~/db/schema";
import {
  updateQuestion,
  type WizardQuestion,
  type WizardState,
} from "~/modules/quiz-editor";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

/** A question's text and type, in the questions step. */
export function QuizQuestionFields({
  question: q,
  setWizard,
}: {
  question: WizardQuestion;
  setWizard: Dispatch<SetStateAction<WizardState>>;
}) {
  return (
    <div className="flex-1 space-y-3">
      <Input
        value={q.text}
        onChange={(event) =>
          setWizard((prev) =>
            updateQuestion(prev, q.id, {
              text: event.target.value,
            })
          )
        }
        placeholder="Enter question text..."
      />
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Type:</Label>
        <Select
          value={q.type}
          onValueChange={(value) =>
            setWizard((prev) =>
              updateQuestion(prev, q.id, {
                type: value as QuestionType,
              })
            )
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={QuestionType.MultipleChoice}>
              Multiple Choice
            </SelectItem>
            <SelectItem value={QuestionType.TrueFalse}>True / False</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
