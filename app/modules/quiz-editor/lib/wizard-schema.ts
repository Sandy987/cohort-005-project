import { z } from "zod";
import { QuestionType } from "~/db/schema";

const wizardDataSchema = z.object({
  title: z.string().trim().min(1, "Quiz title is required."),
  passingScore: z.number(),
  questions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        type: z.nativeEnum(QuestionType),
        options: z.array(
          z.object({
            id: z.string(),
            text: z.string(),
            isCorrect: z.boolean(),
          })
        ),
      })
    )
    .min(1, "At least one question is required."),
});

export type WizardData = z.infer<typeof wizardDataSchema>;

export const quizActionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("save-quiz"),
    wizardData: z.string(),
  }),
  z.object({
    intent: z.literal("delete-quiz"),
  }),
]);

/** The wizard state posted as JSON, or null when it is not valid quiz data. */
export function parseWizardData(json: string): WizardData | null {
  try {
    const result = wizardDataSchema.safeParse(JSON.parse(json));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
