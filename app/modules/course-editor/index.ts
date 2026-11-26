import { planDrop as plan, type Drop, type DropModule } from "./lib/drop-plan";

export type { Drop, DropModule, DropSubmission } from "./lib/drop-plan";

/**
 * What a drag-and-drop on the course editor should save, as the form fields
 * to post to the editor's action: a module reorder, a lesson reorder within
 * one module, or a lesson moved to another module. `null` when the drop
 * changes nothing (dropped outside a list, back where it started, or onto a
 * module or lesson that isn't in `modules`).
 */
export function planDrop(result: Drop, modules: DropModule[]) {
  return plan(result, modules);
}
