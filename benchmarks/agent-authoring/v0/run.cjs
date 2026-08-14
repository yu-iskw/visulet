#!/usr/bin/env node

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { scoreAuthoringCandidate, validateVisualDocument } = require('../../../packages/common/dist/index.js');

const root = __dirname;

function readJsonLines(path) {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function parseArguments(argv) {
  let candidates;
  let control = false;
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--candidates') {
      candidates = argv[index + 1];
      index += 1;
    } else if (value === '--control') {
      control = true;
    } else if (value === '--json') {
      json = true;
    }
  }
  return { candidates, control, json };
}

function chartCandidate(type) {
  return {
    version: '0',
    data: {
      data: {
        values: [
          { category: 'A', value: 1 },
          { category: 'B', value: 2 },
        ],
        schema: {
          fields: [
            { name: 'category', type: 'string' },
            { name: 'value', type: 'number' },
          ],
        },
      },
    },
    views: [
      {
        id: 'visual',
        kind: 'chart',
        chart: type,
        data: 'data',
        encoding: {
          x: { field: 'category', type: 'nominal' },
          y: { field: 'value', type: 'quantitative' },
        },
      },
    ],
  };
}

function diagramCandidate(type) {
  return {
    version: '0',
    views: [
      {
        id: 'visual',
        kind: 'diagram',
        diagram: type,
        nodes: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        edges: [{ from: 'a', to: 'b' }],
      },
    ],
  };
}

function infographicCandidate(type) {
  return {
    version: '0',
    views: [
      {
        id: 'visual',
        kind: 'infographic',
        structure: type,
        items: [{ title: 'A' }, { title: 'B' }],
      },
    ],
  };
}

function compositionCandidate() {
  return {
    version: '0',
    data: {
      data: { values: [{ category: 'A', value: 1 }] },
    },
    views: [
      {
        id: 'visual',
        kind: 'container',
        views: [
          { id: 'text', kind: 'text', markdown: '# Overview' },
          { id: 'metric', kind: 'metric', value: 1 },
          {
            id: 'chart',
            kind: 'chart',
            chart: 'bar',
            data: 'data',
            encoding: {
              x: { field: 'category', type: 'nominal' },
              y: { field: 'value', type: 'quantitative' },
            },
          },
          { id: 'table', kind: 'table', data: 'data', columns: [{ field: 'category' }] },
        ],
      },
    ],
  };
}

function controlCandidate(testCase) {
  const expected = testCase.expected;
  if (expected.kind === 'chart') return chartCandidate(expected.visualType ?? 'bar');
  if (expected.kind === 'diagram') return diagramCandidate(expected.visualType ?? 'flowchart');
  if (expected.kind === 'infographic') return infographicCandidate(expected.visualType ?? 'list');
  if (expected.kind === 'container') return compositionCandidate();
  if (expected.kind === 'native') {
    return {
      version: '0',
      views: [{ id: 'visual', kind: 'native', renderer: 'control', spec: {} }],
    };
  }
  return { version: '0', views: [{ id: 'visual', kind: 'text', markdown: 'Control' }] };
}

function average(values) {
  return values.length === 0 ? undefined : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const cases = readJsonLines(resolve(root, 'cases.jsonl'));
  if (!args.control && args.candidates === undefined) {
    throw new Error('Pass --control or --candidates <jsonl>');
  }

  const records = args.control
    ? cases.map((testCase) => ({
        caseId: testCase.id,
        representation: 'visulet',
        candidate: controlCandidate(testCase),
        control: true,
      }))
    : readJsonLines(resolve(process.cwd(), args.candidates));

  const caseById = new Map(cases.map((testCase) => [testCase.id, testCase]));
  const scored = [];
  const baselineRecords = [];
  for (const record of records) {
    const testCase = caseById.get(record.caseId);
    if (testCase === undefined) {
      throw new Error(`Unknown benchmark case: ${record.caseId}`);
    }
    if ((record.representation ?? 'visulet') !== 'visulet') {
      baselineRecords.push({ ...record, category: testCase.category, baseline: testCase.baseline });
      continue;
    }
    const score = scoreAuthoringCandidate(record.candidate, testCase.expected);
    const validation = validateVisualDocument(record.candidate);
    scored.push({
      caseId: record.caseId,
      category: testCase.category,
      baseline: testCase.baseline,
      score,
      valid: validation.valid,
      metrics: record.metrics,
      control: record.control === true,
    });
  }

  const nativeEscapes = scored.filter((item) => item.score.portability === 0).length;
  const summary = {
    corpus: {
      cases: cases.length,
      categories: Object.fromEntries(
        [...new Set(cases.map((testCase) => testCase.category))].map((category) => [
          category,
          cases.filter((testCase) => testCase.category === category).length,
        ]),
      ),
      comparativeBaselines: {
        'vega-lite': cases.filter((testCase) => testCase.baseline === 'vega-lite').length,
        mermaid: cases.filter((testCase) => testCase.baseline === 'mermaid').length,
      },
    },
    visulet: {
      candidates: scored.length,
      coverage: scored.length / cases.length,
      averageScore: average(scored.map((item) => item.score.score)),
      validRate: average(scored.map((item) => (item.valid ? 1 : 0))),
      nativeEscapeRate: scored.length === 0 ? undefined : nativeEscapes / scored.length,
      averageInputTokens: average(scored.flatMap((item) => item.metrics?.inputTokens ?? [])),
      averageOutputTokens: average(scored.flatMap((item) => item.metrics?.outputTokens ?? [])),
      averageCorrectionTurns: average(scored.flatMap((item) => item.metrics?.correctionTurns ?? [])),
      averageLatencyMs: average(scored.flatMap((item) => item.metrics?.latencyMs ?? [])),
    },
    baselines: Object.fromEntries(
      ['vega-lite', 'mermaid'].map((representation) => {
        const entries = baselineRecords.filter((record) => record.representation === representation);
        return [
          representation,
          {
            candidates: entries.length,
            validRate: average(entries.flatMap((entry) => entry.metrics?.valid === undefined ? [] : [entry.metrics.valid ? 1 : 0])),
            averageInputTokens: average(entries.flatMap((entry) => entry.metrics?.inputTokens ?? [])),
            averageOutputTokens: average(entries.flatMap((entry) => entry.metrics?.outputTokens ?? [])),
            averageCorrectionTurns: average(entries.flatMap((entry) => entry.metrics?.correctionTurns ?? [])),
            averageLatencyMs: average(entries.flatMap((entry) => entry.metrics?.latencyMs ?? [])),
          },
        ];
      }),
    ),
    results: scored,
  };

  process.stdout.write(args.json ? `${JSON.stringify(summary, null, 2)}\n` : [
    `Corpus: ${summary.corpus.cases} cases`,
    `Vizulet candidates: ${summary.visulet.candidates}`,
    `Average score: ${summary.visulet.averageScore ?? 'n/a'}`,
    `Valid rate: ${summary.visulet.validRate ?? 'n/a'}`,
    `Native escape rate: ${summary.visulet.nativeEscapeRate ?? 'n/a'}`,
    `Baseline records: Vega-Lite=${summary.baselines['vega-lite'].candidates}, Mermaid=${summary.baselines.mermaid.candidates}`,
  ].join('\n') + '\n');
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
