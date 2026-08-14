import Ajv2020 from 'ajv/dist/2020';
import visualDocumentV0Schema from '@visulet/schema';

import type { ErrorObject } from 'ajv';
import type { Diagnostic, ValidationResult } from './types';

const validator = new Ajv2020({
  allErrors: true,
  strict: true,
  validateFormats: false,
}).compile(visualDocumentV0Schema);

function unescapePointerToken(token: string): string {
  return token.replaceAll('~1', '/').replaceAll('~0', '~');
}

function instancePathToDiagnosticPath(instancePath: string): string {
  if (instancePath.length === 0) {
    return '$';
  }

  return instancePath
    .split('/')
    .slice(1)
    .map(unescapePointerToken)
    .reduce((path, token) => {
      if (/^\d+$/.test(token)) {
        return `${path}[${token}]`;
      }
      return /^[A-Za-z_$][\w$]*$/.test(token)
        ? `${path}.${token}`
        : `${path}[${JSON.stringify(token)}]`;
    }, '$');
}

function errorToDiagnostic(error: ErrorObject): Diagnostic {
  const suffix = error.message === undefined ? error.keyword : `${error.keyword}: ${error.message}`;
  return {
    code: 'schema.invalid',
    severity: 'error',
    path: instancePathToDiagnosticPath(error.instancePath),
    message: suffix,
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
