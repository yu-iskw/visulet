import visualDocumentV0Schema from '@visulet/schema';
import Ajv2020Validator from 'ajv/dist/2020';

import type { Diagnostic, ValidationResult } from './types';
import type { ErrorObject } from 'ajv';

const validator = new Ajv2020Validator({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
  strictRequired: false,
  validateFormats: false,
}).compile(visualDocumentV0Schema);

function errorToDiagnostic(error: ErrorObject): Diagnostic {
  const suffix = error.message === undefined ? error.keyword : `${error.keyword}: ${error.message}`;
  return {
    code: 'schema.invalid',
    severity: 'error',
    path: error.instancePath,
    message: suffix,
    metadata: { keyword: error.keyword },
  };
}

export function validateVisualDocumentStructure(input: unknown): ValidationResult {
  const valid = validator(input);
  if (valid) {
    return { valid: true, diagnostics: [] };
  }

  return {
    valid: false,
    diagnostics: (validator.errors ?? []).map(errorToDiagnostic),
  };
}
