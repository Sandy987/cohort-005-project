import type { Dispatch, SetStateAction } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
  addQuestion,
  moveQuestion,
  removeQuestion,
  type WizardQuestion,
  type WizardState,
} from "~/modules/quiz-editor";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { QuizQuestionFields } from "~/components/quiz-question-fields";

type SetWizard = Dispatch<SetStateAction<WizardState>>;

export function QuizQuestionsStep({
  wizard,
  setWizard,
}: {
  wizard: WizardState;
  setWizard: SetWizard;
}) {
  function handleQuestionDragEnd(result: DropResult) {
    if (!result.destination) return;
    const fromIndex = result.source.index;
    const toIndex = result.destination.index;
    if (fromIndex === toIndex) return;

    setWizard((prev) => moveQuestion(prev, fromIndex, toIndex));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Questions</h2>
          <p className="text-sm text-muted-foreground">
            Add questions to your quiz. Drag to reorder. You&apos;ll set answer
            options in the next step.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {wizard.questions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No questions added yet. Click &quot;Add Question&quot; to get
              started.
            </p>
          )}

          <DragDropContext onDragEnd={handleQuestionDragEnd}>
            <QuestionList questions={wizard.questions} setWizard={setWizard} />
          </DragDropContext>

          <Button
            variant="outline"
            onClick={() => setWizard((prev) => addQuestion(prev))}
          >
            <Plus className="mr-1.5 size-4" />
            Add Question
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionList({
  questions,
  setWizard,
}: {
  questions: WizardQuestion[];
  setWizard: SetWizard;
}) {
  return (
    <Droppable droppableId="quiz-questions" type="question">
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="space-y-4"
        >
          {questions.map((q, idx) => (
            <QuestionRow
              key={q.id}
              question={q}
              index={idx}
              setWizard={setWizard}
            />
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

function QuestionRow({
  question: q,
  index: idx,
  setWizard,
}: {
  question: WizardQuestion;
  index: number;
  setWizard: SetWizard;
}) {
  return (
    <Draggable draggableId={q.id} index={idx}>
      {(dragProvided, snapshot) => (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          className={`flex items-start gap-3 rounded-lg border p-4 ${
            snapshot.isDragging
              ? "bg-muted shadow-lg ring-2 ring-primary/20"
              : ""
          }`}
        >
          <div
            {...dragProvided.dragHandleProps}
            className="mt-2 cursor-grab text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="size-4" />
          </div>
          <span className="mt-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {idx + 1}
          </span>
          <QuizQuestionFields question={q} setWizard={setWizard} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWizard((prev) => removeQuestion(prev, q.id))}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </Draggable>
  );
}
