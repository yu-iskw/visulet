import { enforceResourceLimits } from './limits';
import { validateVisualDocumentStructure } from './schema-validation';
import { DEFAULT_RESOURCE_LIMITS } from './types';
import { validateVisualDocument as validateVisualDocumentSemantics } from './validate';

import type { ValidationOptions, ValidationResult } from './types';

export function validateVisualDocument(
  input: unknown,
  options?: ValidationOptions,
): ValidationResult {
  const limits = enforceResourceLimits(input, options?.limits ?? DEFAULT_RESOURCE_LIMITS);
  if (!limits.valid) {
    return limits;
  }
  const structural = validateVisualDocumentStructure(input);
  if (!structural.valid) {
    return structural;
  }
  return validateVisualDocumentSemantics(input);
}

export { validateVisualDocumentSemantics };
