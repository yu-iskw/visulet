/* eslint-disable security/detect-non-literal-fs-filename -- tests use temp files */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadScoringProfile, writeRunArtifacts } from './load';
import { parseBenchmarkCase, parseCandidateRecord } from './parse';
import { DEFAULT_SCORING_PROFILE } from './types';

describe('loadScoringProfile', () => {
  it('falls back when the file is not a scoring profile', () => {
    const directory = mkdtempSync(join(tmpdir(), 'visulet-profile-'));
    const path = join(directory, 'profile.json');
    writeFileSync(path, '{"hello":true}');
    expect(loadScoringProfile(path)).toEqual(DEFAULT_SCORING_PROFILE);
    writeRunArtifacts(directory, '{}', '#');
    expect(parseBenchmarkCase({ id: 'x', version: 1 })).toBeUndefined();
    expect(parseCandidateRecord('nope')).toBeUndefined();
  });
});
