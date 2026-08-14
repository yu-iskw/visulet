import { validateVisualDocumentStructure } from './schema-validation';
import { validateVisualDocument as validateVisualDocumentSemantics } from './validate';

import type { ValidationResult } from './types';

export function validateVisualDocument(input: unknown): ValidationResult {
  const structural = validateVisualDocumentStructure(input);
  if (!structural.valid) {
    return structural;
  }
  return validateVisualDocumentSemantics(input);
}

export { validateVisualDocumentSemantics };
