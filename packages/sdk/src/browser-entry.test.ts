import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as sdk from './index.js';

const indexSource = readFileSync(fileURLToPath(new URL('./index.ts', import.meta.url)), 'utf8');

describe('browser entry', () => {
  it('does not import Node data helpers from the root barrel', () => {
    expect(indexSource).not.toContain('./data.js');
  });

  it('does not export Node filesystem helpers', () => {
    expect('loadLocalDataValues' in sdk).toBe(false);
    expect('parseDelimited' in sdk).toBe(false);
    expect('readBoundedFile' in sdk).toBe(false);
  });
});
