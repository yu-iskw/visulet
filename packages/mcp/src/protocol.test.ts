import { Client, InMemoryTransport, ResourceNotFoundError } from '@modelcontextprotocol/client';
import { listChartTypes } from '@visulet/sdk';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CATALOG_TEMPLATES, CATALOG_URIS } from './catalog.js';
import { PROMPT_NAMES } from './prompts.js';
import { createServer } from './server.js';

import type { ReadResourceResult } from '@modelcontextprotocol/client';
import type { McpServer } from '@modelcontextprotocol/server';

const JSON_MIME = 'application/json';

type Session = {
  client: Client;
  server: McpServer;
};

const connectSession = async (): Promise<Session> => {
  const server = createServer({ disableFileReference: true });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'visulet-mcp-test', version: '0.0.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, server };
};

const textOf = (contents: ReadResourceResult['contents']): string => {
  const first = contents.at(0);
  if (first === undefined || !('text' in first)) {
    throw new Error('expected resource text');
  }
  return first.text;
};

describe('MCP catalog protocol', () => {
  let session: Session;

  beforeEach(async () => {
    session = await connectSession();
  });

  afterEach(async () => {
    await session.client.close();
    await session.server.close();
  });

  it('lists static catalog URIs and template instances', async () => {
    const listed = await session.client.listResources();
    const uris = listed.resources.map((resource) => resource.uri);
    expect(uris).toContain(CATALOG_URIS.chartTypes);
    expect(uris).toContain(CATALOG_URIS.schema);
    expect(uris).toContain(CATALOG_URIS.agentSkill);
    expect(uris).toContain('visulet://chart-types/vegalite');
    expect(uris).toContain('visulet://themes/paper');
    expect(uris).not.toContain('visulet://chart-types/vegalite/bar');
  });

  it('advertises the three catalog URI templates', async () => {
    const templates = await session.client.listResourceTemplates();
    const patterns = templates.resourceTemplates.map((item) => item.uriTemplate);
    expect(patterns).toEqual(
      expect.arrayContaining([
        CATALOG_TEMPLATES.chartTypesByBackend,
        CATALOG_TEMPLATES.chartType,
        CATALOG_TEMPLATES.theme,
      ]),
    );
  });

  it('reads a backend-filtered chart-type list', async () => {
    const result = await session.client.readResource({
      uri: 'visulet://chart-types/vegalite',
    });
    const parsed = JSON.parse(textOf(result.contents)) as unknown[];
    expect(parsed).toHaveLength(listChartTypes('vegalite').length);
    expect(result.contents[0]?.mimeType).toBe(JSON_MIME);
  });

  it('reads one chart type by backend and id', async () => {
    const result = await session.client.readResource({
      uri: 'visulet://chart-types/vegalite/bar',
    });
    const parsed = JSON.parse(textOf(result.contents)) as {
      channels: string[];
      id: string;
    };
    expect(parsed).toMatchObject({ id: 'bar' });
    expect(parsed.channels.length).toBeGreaterThan(0);
  });

  it('returns ResourceNotFoundError for an unknown theme', async () => {
    await expect(session.client.readResource({ uri: 'visulet://themes/nyt' })).rejects.toSatisfy(
      (error: unknown) =>
        ResourceNotFoundError.isInstance(error) &&
        error.code === -32602 &&
        error.uri === 'visulet://themes/nyt',
    );
  });

  it('lists authoring prompt arguments', async () => {
    const listed = await session.client.listPrompts();
    const chart = listed.prompts.find((prompt) => prompt.name === PROMPT_NAMES[0]);
    expect(chart?.title).toBe('Author a Visulet chart');
    expect(chart?.arguments?.some((argument) => argument.name === 'chartType')).toBe(true);
  });

  it('embeds the skill and chart-type slice in author_visulet_chart', async () => {
    const result = await session.client.getPrompt({
      name: PROMPT_NAMES[0],
      arguments: { chartType: 'bar', backend: 'vegalite' },
    });
    const resources = result.messages.filter((message) => message.content.type === 'resource');
    expect(
      resources.some(
        (message) =>
          message.content.type === 'resource' &&
          message.content.resource.uri === CATALOG_URIS.agentSkill,
      ),
    ).toBe(true);
    expect(
      resources.some(
        (message) =>
          message.content.type === 'resource' &&
          message.content.resource.uri.includes('/vegalite/bar'),
      ),
    ).toBe(true);
  });

  it('completes prompt theme arguments', async () => {
    const result = await session.client.complete({
      ref: { type: 'ref/prompt', name: PROMPT_NAMES[0] },
      argument: { name: 'theme', value: 'pa' },
    });
    expect(result.completion.values).toContain('paper');
  });

  it('completes chart-type template ids for one backend', async () => {
    const chartjsIds = new Set(listChartTypes('chartjs').map((item) => item.id));
    const result = await session.client.complete({
      ref: { type: 'ref/resource', uri: CATALOG_TEMPLATES.chartType },
      argument: { name: 'id', value: '' },
      context: { arguments: { backend: 'chartjs' } },
    });
    expect(result.completion.values.length).toBeGreaterThan(0);
    expect(result.completion.values.every((id) => chartjsIds.has(id))).toBe(true);
    expect(result.completion.values.length).toBe(chartjsIds.size);
  });
});
