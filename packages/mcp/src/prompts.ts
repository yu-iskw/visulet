import { completable } from '@modelcontextprotocol/server';
import { z } from 'zod';

import { readSkill } from './assets.js';
import {
  CATALOG_URIS,
  chartTypeUri,
  completeBackend,
  completeChartType,
  completeTheme,
  DEFAULT_BACKEND,
  DEFAULT_THEME,
  isCatalogMiss,
  parseBackend,
  readTheme,
  resolveChartTypeSlice,
  themeUri,
} from './catalog.js';

import type { McpServer } from '@modelcontextprotocol/server';

export const PROMPT_NAMES = ['author_visulet_chart', 'author_visulet_theme'] as const;

const MARKDOWN_MIME = 'text/markdown';
const JSON_MIME = 'application/json';

type PromptMessage = {
  content:
    | { resource: { mimeType: string; text: string; uri: string }; type: 'resource' }
    | { text: string; type: 'text' };
  role: 'user';
};

const optionalText = (value: string | undefined): string | undefined => {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  return value;
};

const chartArgs = z.object({
  backend: completable(z.string().describe('Assemble backend id'), (value) =>
    completeBackend(String(value)),
  ).optional(),
  chartType: completable(z.string().describe('Catalog chart type id'), (value, context) =>
    completeChartType(String(value), context),
  ).optional(),
  theme: completable(z.string().describe('Theme preset id'), (value) =>
    completeTheme(String(value)),
  ).optional(),
  intent: z.string().describe('What the user wants to chart').optional(),
});

const themeArgs = z.object({
  theme: completable(z.string().describe('Theme preset id'), (value) =>
    completeTheme(String(value)),
  ).optional(),
  intent: z.string().describe('How the theme should look or where it will be used').optional(),
});

const skillMessage = (uri: string, text: string): PromptMessage => ({
  role: 'user',
  content: {
    type: 'resource',
    resource: { uri, mimeType: MARKDOWN_MIME, text },
  },
});

const jsonMessage = (uri: string, payload: unknown): PromptMessage => ({
  role: 'user',
  content: {
    type: 'resource',
    resource: { uri, mimeType: JSON_MIME, text: JSON.stringify(payload) },
  },
});

const authorChartMessages = (args: {
  backend?: string;
  chartType?: string;
  intent?: string;
  theme?: string;
}): PromptMessage[] => {
  const backend = parseBackend(optionalText(args.backend)) ?? DEFAULT_BACKEND;
  const chartType = optionalText(args.chartType);
  const theme = optionalText(args.theme) ?? DEFAULT_THEME;
  const intent = optionalText(args.intent);
  const slice = resolveChartTypeSlice(backend, chartType);
  const messages: PromptMessage[] = [skillMessage(CATALOG_URIS.agentSkill, readSkill('chart'))];
  if (slice) {
    messages.push(jsonMessage(chartTypeUri(backend, slice.id), slice));
  }
  const lines = [
    'Author a Visulet ChartAssemblyInput (semantic_types plus chart_spec).',
    `Backend: ${backend}.`,
    `Theme: ${theme}.`,
  ];
  if (slice) {
    lines.push(`Chart type: ${slice.chart} (id ${slice.id}).`);
  } else if (chartType) {
    lines.push(`Requested chart type: ${chartType}.`);
  }
  if (intent) {
    lines.push(`Intent: ${intent}.`);
  }
  messages.push({ role: 'user', content: { type: 'text', text: lines.join('\n') } });
  return messages;
};

const authorThemeMessages = (args: { intent?: string; theme?: string }): PromptMessage[] => {
  const theme = optionalText(args.theme);
  const intent = optionalText(args.intent);
  const messages: PromptMessage[] = [skillMessage(CATALOG_URIS.themeSkill, readSkill('theme'))];
  if (theme) {
    try {
      messages.push(jsonMessage(themeUri(theme), readTheme(theme)));
    } catch (error) {
      if (!isCatalogMiss(error)) {
        throw error;
      }
    }
  }
  const lines = [
    'Author a Visulet ThemeSpec. Use extends with a preset id plus a small set of overrides.',
  ];
  if (theme) {
    lines.push(`Start from preset: ${theme}.`);
  } else {
    lines.push(`Default preset: ${DEFAULT_THEME}.`);
  }
  if (intent) {
    lines.push(`Intent: ${intent}.`);
  }
  messages.push({ role: 'user', content: { type: 'text', text: lines.join('\n') } });
  return messages;
};

export const registerPrompts = (server: McpServer): void => {
  const [authorChart, authorTheme] = PROMPT_NAMES;
  server.registerPrompt(
    authorChart,
    {
      title: 'Author a Visulet chart',
      description: 'Author a Visulet ChartAssemblyInput.',
      argsSchema: chartArgs,
    },
    (args) => ({
      description: 'Author a Visulet chart spec.',
      messages: authorChartMessages(args),
    }),
  );

  server.registerPrompt(
    authorTheme,
    {
      title: 'Author a Visulet theme',
      description: 'Author a Visulet ThemeSpec.',
      argsSchema: themeArgs,
    },
    (args) => ({
      description: 'Author a Visulet ThemeSpec.',
      messages: authorThemeMessages(args),
    }),
  );
};
