import type { BenchmarkCase, BenchmarkTarget, PromptProfileId } from './types';

export const PROMPT_PROFILE_IDS = [
  'minimal',
  'schema-assisted',
  'diagnostic-repair',
  'mcp-tool-repair',
] as const satisfies readonly PromptProfileId[];

export const DEFAULT_SCHEMA_FRAGMENT =
  'VisualDocument v0 JSON: {"version":"0","data?":{"id":{"values":[{}]}},"views":[{"id":"string","kind":"chart|diagram|infographic|table|text|metric|container|native"}]}';

export interface PromptProfileInput {
  readonly benchmarkCase: BenchmarkCase;
  readonly target: BenchmarkTarget;
  readonly schemaFragment?: string;
  readonly invalidCandidate?: string;
  readonly diagnostics?: unknown;
  readonly startingArtifact?: unknown;
}

export interface BuiltPrompt {
  readonly system: string;
  readonly prompt: string;
}

const TARGET_HINT: Readonly<Record<BenchmarkTarget, string>> = {
  visulet: 'Emit a VisualDocument v0 JSON object only.',
  'vega-lite': 'Emit a Vega-Lite JSON specification only.',
  mermaid: 'Emit Mermaid source text only.',
};

function hintFor(target: BenchmarkTarget): string {
  switch (target) {
    case 'visulet':
      return TARGET_HINT.visulet;
    case 'vega-lite':
      return TARGET_HINT['vega-lite'];
    case 'mermaid':
      return TARGET_HINT.mermaid;
    default: {
      const exhaustive: never = target;
      return exhaustive;
    }
  }
}

function systemFor(target: BenchmarkTarget): string {
  return `${hintFor(target)} No markdown fences. No commentary.`;
}

function artifactText(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function caseHeader(input: PromptProfileInput): string {
  const expected = `${input.benchmarkCase.expected.kind}${
    input.benchmarkCase.expected.visualType === undefined
      ? ''
      : `/${input.benchmarkCase.expected.visualType}`
  }`;
  const starting =
    input.startingArtifact === undefined
      ? ''
      : `\nStarting: ${artifactText(input.startingArtifact)}`;
  return `Target: ${input.target}\nExpected: ${expected}\nTask: ${input.benchmarkCase.prompt}${starting}`;
}

export function buildPrompt(profile: PromptProfileId, input: PromptProfileInput): BuiltPrompt {
  const system = systemFor(input.target);
  switch (profile) {
    case 'minimal':
      return { system, prompt: caseHeader(input) };
    case 'schema-assisted':
      return {
        system,
        prompt: `${caseHeader(input)}\nSchema: ${input.schemaFragment ?? DEFAULT_SCHEMA_FRAGMENT}`,
      };
    case 'diagnostic-repair':
      return {
        system,
        prompt: `${caseHeader(input)}\nRepair the invalid candidate using diagnostics.\nCandidate: ${input.invalidCandidate ?? ''}\nDiagnostics: ${JSON.stringify(input.diagnostics ?? [])}`,
      };
    case 'mcp-tool-repair':
      return {
        system,
        prompt: `${caseHeader(input)}\nUse visulet MCP tools conceptually: visual_validate, then visual_apply_patch (RFC 6902) or a corrected document.\nCandidate: ${input.invalidCandidate ?? ''}\nDiagnostics: ${JSON.stringify(input.diagnostics ?? [])}`,
      };
    default: {
      const exhaustive: never = profile;
      return exhaustive;
    }
  }
}
