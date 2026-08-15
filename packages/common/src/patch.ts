/* eslint-disable security/detect-object-injection -- JSON Pointer must index document keys supplied by the patch */
import { validateVisualDocument } from './document-validation';
import { jsonPointer } from './json-pointer';
import { DEFAULT_RESOURCE_LIMITS } from './types';
import { isRecord } from './value';

import type { Diagnostic, ResourceLimits, ValidationResult, VisualDocument } from './types';

const OPERATIONS = new Set(['add', 'remove', 'replace', 'move', 'copy', 'test']);
const PATCH_INVALID_OPERATION = 'patch.invalid_operation';

export interface JsonPatchOperation {
  readonly op: string;
  readonly path: string;
  readonly from?: string;
  readonly value?: unknown;
}

export interface PatchResult {
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly document?: VisualDocument;
  readonly operationCount: number;
}

interface PointerHit {
  readonly parent: Record<string, unknown> | unknown[];
  readonly key: string | number;
}

function patchDiagnostic(code: string, path: string, message: string): Diagnostic {
  return { code, severity: 'error', path, message };
}

function splitPointer(pointer: string): string[] | undefined {
  if (pointer === '') {
    return [];
  }
  if (!pointer.startsWith('/')) {
    return undefined;
  }
  return pointer
    .slice(1)
    .split('/')
    .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function cloneDocument(document: unknown): unknown {
  return structuredClone(document);
}

function isArrayIndex(token: string, parent: unknown[]): boolean {
  // eslint-disable-next-line security/detect-possible-timing-attacks -- JSON Pointer '-' token, not a secret
  if (token === '-') {
    return true;
  }
  if (!/^(0|[1-9]\d*)$/.test(token)) {
    return false;
  }
  const index = Number(token);
  return index >= 0 && index <= parent.length;
}

function readParent(root: unknown, tokens: readonly string[]): PointerHit | undefined {
  if (tokens.length === 0) {
    return undefined;
  }
  let current: unknown = root;
  for (const token of tokens.slice(0, -1)) {
    if (Array.isArray(current)) {
      const index = Number(token);
      if (!isArrayIndex(token, current) || token === '-' || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    if (!isRecord(current) || !Object.hasOwn(current, token)) {
      return undefined;
    }
    current = current[token];
  }
  const last = tokens.at(-1);
  if (last === undefined) {
    return undefined;
  }
  if (Array.isArray(current)) {
    if (!isArrayIndex(last, current)) {
      return undefined;
    }
    return { parent: current, key: last === '-' ? current.length : Number(last) };
  }
  if (!isRecord(current)) {
    return undefined;
  }
  return { parent: current, key: last };
}

function readValue(root: unknown, pointer: string): { found: boolean; value: unknown } {
  const tokens = splitPointer(pointer);
  if (tokens === undefined) {
    return { found: false, value: undefined };
  }
  if (tokens.length === 0) {
    return { found: true, value: root };
  }
  const hit = readParent(root, tokens);
  if (hit === undefined) {
    return { found: false, value: undefined };
  }
  if (Array.isArray(hit.parent)) {
    const index = Number(hit.key);
    if (index >= hit.parent.length) {
      return { found: false, value: undefined };
    }
    return { found: true, value: hit.parent[index] };
  }
  if (!Object.hasOwn(hit.parent, String(hit.key))) {
    return { found: false, value: undefined };
  }
  return { found: true, value: hit.parent[String(hit.key)] };
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function applyAdd(hit: PointerHit, value: unknown): boolean {
  if (Array.isArray(hit.parent)) {
    const index = Number(hit.key);
    if (index > hit.parent.length) {
      return false;
    }
    hit.parent.splice(index, 0, value);
    return true;
  }
  hit.parent[String(hit.key)] = value;
  return true;
}

function applyRemove(hit: PointerHit): { ok: boolean; removed: unknown } {
  if (Array.isArray(hit.parent)) {
    const index = Number(hit.key);
    if (index >= hit.parent.length) {
      return { ok: false, removed: undefined };
    }
    const [removed] = hit.parent.splice(index, 1);
    return { ok: true, removed };
  }
  const key = String(hit.key);
  if (!Object.hasOwn(hit.parent, key)) {
    return { ok: false, removed: undefined };
  }
  const removed = hit.parent[key];
  Reflect.deleteProperty(hit.parent, key);
  return { ok: true, removed };
}

function applyReplace(hit: PointerHit, value: unknown): boolean {
  if (Array.isArray(hit.parent)) {
    const index = Number(hit.key);
    if (index >= hit.parent.length) {
      return false;
    }
    hit.parent[index] = value;
    return true;
  }
  const key = String(hit.key);
  if (!Object.hasOwn(hit.parent, key)) {
    return false;
  }
  hit.parent[key] = value;
  return true;
}

function parseOperation(
  value: unknown,
  index: number,
  diagnostics: Diagnostic[],
): JsonPatchOperation | undefined {
  if (!isRecord(value) || typeof value.op !== 'string' || typeof value.path !== 'string') {
    diagnostics.push(
      patchDiagnostic(
        PATCH_INVALID_OPERATION,
        jsonPointer([String(index)]),
        'Patch operation must include op and path',
      ),
    );
    return undefined;
  }
  if (!OPERATIONS.has(value.op)) {
    diagnostics.push(
      patchDiagnostic(
        PATCH_INVALID_OPERATION,
        jsonPointer([String(index), 'op']),
        `Unsupported op ${value.op}`,
      ),
    );
    return undefined;
  }
  const from = typeof value.from === 'string' ? value.from : undefined;
  if ((value.op === 'move' || value.op === 'copy') && from === undefined) {
    diagnostics.push(
      patchDiagnostic(
        PATCH_INVALID_OPERATION,
        jsonPointer([String(index), 'from']),
        `${value.op} requires from`,
      ),
    );
    return undefined;
  }
  return { op: value.op, path: value.path, from, value: value.value };
}

export function validateVisualDocumentPatch(patch: unknown): ValidationResult {
  if (!Array.isArray(patch)) {
    return {
      valid: false,
      diagnostics: [patchDiagnostic(PATCH_INVALID_OPERATION, '', 'Patch must be a JSON array')],
    };
  }
  const parsed = parsePatchOperations(patch);
  return { valid: parsed.diagnostics.length === 0, diagnostics: parsed.diagnostics };
}

function parsePatchOperations(patch: readonly unknown[]): {
  readonly operations: JsonPatchOperation[];
  readonly diagnostics: Diagnostic[];
} {
  const diagnostics: Diagnostic[] = [];
  const operations: JsonPatchOperation[] = [];
  for (const [index, raw] of patch.entries()) {
    const operation = parseOperation(raw, index, diagnostics);
    if (operation !== undefined) {
      operations.push(operation);
    }
  }
  return { operations, diagnostics };
}

const PATCH_INVALID_PATH = 'patch.invalid_path';
const FROM_MISSING = 'from pointer does not exist';

function applyCopyMove(
  document: unknown,
  operation: JsonPatchOperation,
  tokens: readonly string[],
  diagnostics: Diagnostic[],
): unknown {
  const sourcePath = operation.from;
  if (sourcePath === undefined) {
    diagnostics.push(patchDiagnostic(PATCH_INVALID_PATH, '', FROM_MISSING));
    return document;
  }
  const source = readValue(document, sourcePath);
  if (!source.found) {
    diagnostics.push(patchDiagnostic(PATCH_INVALID_PATH, sourcePath, FROM_MISSING));
    return document;
  }
  if (operation.op === 'move') {
    const fromTokens = splitPointer(sourcePath);
    if (fromTokens === undefined || fromTokens.length === 0) {
      diagnostics.push(
        patchDiagnostic(PATCH_INVALID_PATH, sourcePath, 'Cannot move the document root'),
      );
      return document;
    }
    const fromHit = readParent(document, fromTokens);
    if (fromHit === undefined) {
      diagnostics.push(patchDiagnostic(PATCH_INVALID_PATH, sourcePath, FROM_MISSING));
      return document;
    }
    applyRemove(fromHit);
  }
  const hit = readParent(document, tokens);
  if (hit === undefined || !applyAdd(hit, cloneDocument(source.value))) {
    diagnostics.push(
      patchDiagnostic(PATCH_INVALID_PATH, operation.path, 'Cannot apply copy/move at path'),
    );
  }
  return document;
}

function applyMutation(
  document: unknown,
  operation: JsonPatchOperation,
  tokens: readonly string[],
  diagnostics: Diagnostic[],
): unknown {
  const hit = readParent(document, tokens);
  if (hit === undefined) {
    diagnostics.push(
      patchDiagnostic(PATCH_INVALID_PATH, operation.path, 'JSON Pointer does not exist'),
    );
    return document;
  }
  if (operation.op === 'remove') {
    if (!applyRemove(hit).ok) {
      diagnostics.push(patchDiagnostic(PATCH_INVALID_PATH, operation.path, 'Cannot remove path'));
    }
    return document;
  }
  if (operation.op === 'add') {
    if (!applyAdd(hit, operation.value)) {
      diagnostics.push(patchDiagnostic(PATCH_INVALID_PATH, operation.path, 'Cannot add at path'));
    }
    return document;
  }
  if (!applyReplace(hit, operation.value)) {
    diagnostics.push(patchDiagnostic(PATCH_INVALID_PATH, operation.path, 'Cannot replace path'));
  }
  return document;
}

function applyOne(
  document: unknown,
  operation: JsonPatchOperation,
  index: number,
  diagnostics: Diagnostic[],
): unknown {
  if (operation.path === '' && operation.op === 'replace') {
    return operation.value;
  }
  if (operation.path === '' && operation.op === 'test') {
    if (!deepEqual(document, operation.value)) {
      diagnostics.push(
        patchDiagnostic(
          'patch.test_failed',
          jsonPointer([String(index)]),
          'test failed at document root',
        ),
      );
    }
    return document;
  }
  const tokens = splitPointer(operation.path);
  if (tokens === undefined) {
    diagnostics.push(
      patchDiagnostic(
        PATCH_INVALID_PATH,
        jsonPointer([String(index), 'path']),
        'Path must be a JSON Pointer',
      ),
    );
    return document;
  }
  if (operation.op === 'test') {
    const current = readValue(document, operation.path);
    if (!current.found || !deepEqual(current.value, operation.value)) {
      diagnostics.push(
        patchDiagnostic('patch.test_failed', operation.path, 'test operation failed'),
      );
    }
    return document;
  }
  if (operation.op === 'copy' || operation.op === 'move') {
    return applyCopyMove(document, operation, tokens, diagnostics);
  }
  return applyMutation(document, operation, tokens, diagnostics);
}

export function applyVisualDocumentPatch(
  document: unknown,
  patch: unknown,
  options?: { readonly limits?: ResourceLimits },
): PatchResult {
  const limits = options?.limits ?? DEFAULT_RESOURCE_LIMITS;
  if (!Array.isArray(patch)) {
    return {
      valid: false,
      diagnostics: [patchDiagnostic(PATCH_INVALID_OPERATION, '', 'Patch must be a JSON array')],
      operationCount: 0,
    };
  }
  const parsed = parsePatchOperations(patch);
  if (parsed.diagnostics.length > 0) {
    return {
      valid: false,
      diagnostics: parsed.diagnostics,
      operationCount: parsed.operations.length,
    };
  }
  if (parsed.operations.length > limits.maxPatchOperations) {
    return {
      valid: false,
      diagnostics: [
        patchDiagnostic(
          'resource.patch_operations_exceeded',
          '',
          `Patch exceeds ${String(limits.maxPatchOperations)} operations`,
        ),
      ],
      operationCount: parsed.operations.length,
    };
  }
  const diagnostics: Diagnostic[] = [];
  const operations = parsed.operations;
  let current = cloneDocument(document);
  for (const [index, operation] of operations.entries()) {
    current = applyOne(current, operation, index, diagnostics);
    if (diagnostics.length > 0) {
      return { valid: false, diagnostics, operationCount: operations.length };
    }
  }
  const validated = validateVisualDocument(current, { limits });
  if (!validated.valid) {
    return { valid: false, diagnostics: validated.diagnostics, operationCount: operations.length };
  }
  return {
    valid: true,
    diagnostics: validated.diagnostics,
    document: validated.document,
    operationCount: operations.length,
  };
}
