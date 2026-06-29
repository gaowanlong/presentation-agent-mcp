import { generateId } from "../utils/ids.js";
import { PatchOperation, DeckPatch } from "./deck-patch.schema.js";

export function createPatchId(): string {
  return generateId("patch");
}

export function extractAffectedSlideIds(patch: DeckPatch): string[] {
  const ids = new Set<string>();
  for (const op of patch.operations) {
    switch (op.op) {
      case "replace_slide":
        ids.add(op.slide_id);
        break;
      case "update_slide_fields":
        ids.add(op.slide_id);
        break;
      case "delete_slide":
        ids.add(op.slide_id);
        break;
      case "insert_slide":
        if (op.slide && typeof op.slide === "object" && "slide_id" in op.slide) {
          ids.add((op.slide as any).slide_id);
        }
        break;
    }
  }
  return Array.from(ids);
}

export function operationTypeLabel(op: PatchOperation): string {
  const labels: Record<string, string> = {
    replace_slide: "Replace slide",
    update_slide_fields: "Update slide fields",
    insert_slide: "Insert slide",
    delete_slide: "Delete slide",
    apply_style: "Apply style",
  };
  return labels[op.op] || op.op;
}
