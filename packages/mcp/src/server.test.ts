import { describe, expect, it } from 'vitest';

import { readUi } from './assets.js';
import { PROMPT_NAMES } from './prompts.js';
import { RESOURCE_URIS } from './resources.js';
import { createServer } from './server.js';
import { TOOL_NAMES } from './tools.js';

describe('MCP primitive inventory', () => {
  it('lists tools, resources, and prompts as distinct surfaces', () => {
    expect(TOOL_NAMES).toEqual([
      'validate_chart',
      'compile_chart',
      'render_chart',
      'list_chart_types',
      'list_themes',
      'create_chart_view',
    ]);
    expect(RESOURCE_URIS).toEqual({
      chartView: 'ui://visulet/chart-view.html',
      chartTypes: 'visulet://chart-types',
      agentSkill: 'visulet://agent-skill',
      themeSkill: 'visulet://theme-skill',
    });
    expect(PROMPT_NAMES).toEqual(['author_visulet_chart', 'author_visulet_theme']);
  });

  it('composes a server from the three primitive registrars', () => {
    expect(createServer()).toBeTruthy();
    expect(createServer({ disableFileReference: true })).toBeTruthy();
  });

  it('serves Visulet App HTML without Flint chrome', () => {
    const html = readUi();
    expect(html).toContain('Visulet');
    expect(html.toLowerCase()).not.toContain('economist');
    expect(html.toLowerCase()).not.toContain('flint');
  });
});
