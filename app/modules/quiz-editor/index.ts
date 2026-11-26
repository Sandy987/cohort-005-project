// The quiz wizard's state, safe to import from the browser. Each change is a
// pure function from the old state to the new one, for `setWizard(prev => …)`.
export {
  addOption,
  addQuestion,
  canGoNext,
  getValidationErrors,
  initialWizard,
  moveQuestion,
  removeOption,
  removeQuestion,
  setCorrectOption,
  updateOption,
  updateQuestion,
} from "./lib/wizard-state";
export type {
  OptionRef,
  SavedQuiz,
  WizardOption,
  WizardQuestion,
  WizardState,
} from "./lib/wizard-state";
