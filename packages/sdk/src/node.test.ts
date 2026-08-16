import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadLocalDataValues, parseDelimited, readBoundedFile } from './node.js';

describe('node entry', () => {
  it('parses delimited text', () => {
    expect(parseDelimited('a,b\n1,2')).toEqual([{ a: 1, b: 2 }]);
  });

  it('reads a bounded JSON file into values', () => {
    const dir = mkdtempSync(join(tmpdir(), 'visulet-sdk-node-'));
    const file = join(dir, 'rows.json');
    writeFileSync(file, JSON.stringify([{ quarter: 'Q1', revenue: 120 }]));
    expect(readBoundedFile(file)).toContain('Q1');
    expect(loadLocalDataValues(file)).toEqual([{ quarter: 'Q1', revenue: 120 }]);
  });
});
