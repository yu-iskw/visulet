import type { AggregateResult } from './types';

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function renderReportMarkdown(aggregate: AggregateResult): string {
  const lines = [
    `# ${aggregate.experimentId}`,
    '',
    `Scoring profile: ${aggregate.scoringProfile}`,
    `Cases: ${String(aggregate.caseCount)}`,
    `Candidates: ${String(aggregate.candidateCount)}`,
    '',
    '## First-pass validity (Vizulet generation)',
    '',
    `- Structural: ${percent(aggregate.firstPassStructuralValidity)}`,
    `- Semantic: ${percent(aggregate.firstPassSemanticValidity)}`,
    `- Native escape: ${percent(aggregate.nativeEscapeRate)}`,
    `- Mean authoring score: ${aggregate.meanAuthoringScore.toFixed(1)}`,
    `- Mean rewrite ratio: ${aggregate.meanRewriteRatio.toFixed(3)}`,
    '',
    '## Hypotheses',
    '',
    `- Structural after one repair ≥ ${percent(aggregate.hypotheses.structuralValidityAfterOneRepair)}`,
    `- Semantic after one repair ≥ ${percent(aggregate.hypotheses.semanticValidityAfterOneRepair)}`,
    `- Native escape < ${percent(aggregate.hypotheses.nativeEscapeRateMax)}`,
    '',
    '## By target',
    '',
  ];
  for (const [target, stats] of Object.entries(aggregate.byTarget)) {
    lines.push(
      `- ${target}: n=${String(stats.count)} structural ${percent(stats.structuralValidity)} semantic ${percent(stats.semanticValidity)}`,
    );
  }
  lines.push('', '## By category', '');
  for (const [category, stats] of Object.entries(aggregate.byCategory)) {
    lines.push(
      `- ${category}: n=${String(stats.count)} structural ${percent(stats.structuralValidity)} semantic ${percent(stats.semanticValidity)}`,
    );
  }
  if (Object.keys(aggregate.byPromptProfile).length > 0) {
    lines.push('', '## By prompt profile', '');
    for (const [profile, stats] of Object.entries(aggregate.byPromptProfile)) {
      lines.push(
        `- ${profile}: n=${String(stats.count)} structural ${percent(stats.structuralValidity)} semantic ${percent(stats.semanticValidity)}`,
      );
    }
  }
  lines.push(
    '',
    'Live models were not required for this report. CI asserts control-fixture scores only.',
    '',
  );
  return lines.join('\n');
}
