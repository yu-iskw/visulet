interface ModificationDistance {
  readonly rewriteRatio: number;
  readonly changedPaths: number;
  readonly patchOpCount: number;
}

function collectLeaves(value: unknown, path: string, into: Map<string, string>): void {
  if (value === null || typeof value !== 'object') {
    into.set(path, JSON.stringify(value));
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      into.set(path, '[]');
      return;
    }
    for (const [index, item] of value.entries()) {
      collectLeaves(item, `${path}/${String(index)}`, into);
    }
    return;
  }
  const keys = Object.keys(value).sort((left, right) => left.localeCompare(right));
  if (keys.length === 0) {
    into.set(path, '{}');
    return;
  }
  for (const key of keys) {
    collectLeaves(Reflect.get(value, key), `${path}/${key}`, into);
  }
}

function leafState(left: unknown, right: unknown): {
  readonly differing: readonly string[];
  readonly unionSize: number;
} {
  const leftLeaves = new Map<string, string>();
  const rightLeaves = new Map<string, string>();
  collectLeaves(left, '', leftLeaves);
  collectLeaves(right, '', rightLeaves);
  const keys = new Set([...leftLeaves.keys(), ...rightLeaves.keys()]);
  const differing: string[] = [];
  for (const key of keys) {
    if (leftLeaves.get(key) !== rightLeaves.get(key)) {
      differing.push(key === '' ? '/' : key);
    }
  }
  return { differing, unionSize: keys.size };
}

export function rewriteRatioFromText(oldText: string, newText: string): number {
  if (oldText === newText) {
    return 0;
  }
  return Math.min(1, Math.abs(newText.length - oldText.length) / Math.max(oldText.length, 1));
}

export function differingLeafPaths(left: unknown, right: unknown): readonly string[] {
  return leafState(left, right).differing;
}

export function modificationDistance(start: unknown, candidate: unknown): ModificationDistance {
  const { differing, unionSize } = leafState(start, candidate);
  if (differing.length === 0) {
    return { rewriteRatio: 0, changedPaths: 0, patchOpCount: 0 };
  }
  return {
    rewriteRatio: Math.min(1, differing.length / Math.max(unionSize, 1)),
    changedPaths: differing.length,
    patchOpCount: differing.length,
  };
}
