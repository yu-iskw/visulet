import { describe, expect, it } from 'vitest';

import { assessCandidateText, looksLikeVisualDocument } from './assess-candidate';

const visualDocument = {
  version: '0',
  data: { sales: { values: [{ quarter: 'Q1', revenue: 10 }] } },
  views: [
    {
      id: 'revenue',
      kind: 'chart',
      chart: 'bar',
      data: 'sales',
      encoding: { x: { field: 'quarter' }, y: { field: 'revenue' } },
    },
  ],
};

describe('assessCandidateText', () => {
  it('treats Mermaid source as valid and JSON objects as invalid', () => {
    expect(assessCandidateText('flowchart TD\n  a-->b', 'mermaid').invalid).toBe(false);
    expect(assessCandidateText('{"version":"0"}', 'mermaid').invalid).toBe(true);
    expect(assessCandidateText('   ', 'mermaid').invalid).toBe(true);
  });

  it('requires Vega-Lite candidates to be JSON objects', () => {
    expect(assessCandidateText(JSON.stringify({ mark: 'bar' }), 'vega-lite').invalid).toBe(false);
    expect(assessCandidateText('not-json', 'vega-lite').invalid).toBe(true);
    expect(assessCandidateText('null', 'vega-lite').invalid).toBe(true);
  });

  it('validates VisualDocument JSON for visulet', () => {
    expect(assessCandidateText(JSON.stringify(visualDocument), 'visulet').invalid).toBe(false);
    expect(assessCandidateText('not-json', 'visulet').invalid).toBe(true);
  });
});

describe('looksLikeVisualDocument', () => {
  it('requires version 0 and a views array', () => {
    expect(looksLikeVisualDocument(visualDocument)).toBe(true);
    expect(looksLikeVisualDocument({ mark: 'bar' })).toBe(false);
    expect(looksLikeVisualDocument({ version: '0' })).toBe(false);
  });
});
