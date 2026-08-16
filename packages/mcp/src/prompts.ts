import { readSkill } from './assets.js';

import type { McpServer } from '@modelcontextprotocol/server';

export const PROMPT_NAMES = ['author_visulet_chart', 'author_visulet_theme'] as const;

export const registerPrompts = (server: McpServer): void => {
  const [authorChart, authorTheme] = PROMPT_NAMES;
  server.registerPrompt(authorChart, { description: 'Author a Visulet chart spec.' }, () =>
    Promise.resolve({
      messages: [{ role: 'user', content: { type: 'text', text: readSkill('chart') } }],
    }),
  );

  server.registerPrompt(authorTheme, { description: 'Author a Visulet ThemeSpec.' }, () =>
    Promise.resolve({
      messages: [{ role: 'user', content: { type: 'text', text: readSkill('theme') } }],
    }),
  );
};
