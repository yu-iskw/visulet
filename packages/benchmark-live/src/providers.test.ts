import { describe, expect, it } from 'vitest';

import { createLiveProvider } from './providers';

import type { ModelRunRequest } from '@visulet/benchmark';

const request: ModelRunRequest = {
  caseId: 'gen-chart-bar',
  prompt: 'Create a bar chart',
  system: 'JSON only',
  model: 'unit-model',
  temperature: 0,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

function requestHeader(init: Parameters<typeof fetch>[1], name: string): string {
  const headers = init?.headers;
  if (headers instanceof Headers) {
    return headers.get(name) ?? '';
  }
  if (headers === undefined || Array.isArray(headers)) {
    return '';
  }
  return new Headers(headers).get(name) ?? '';
}

function requestBody(init: Parameters<typeof fetch>[1]): string {
  return typeof init?.body === 'string' ? init.body : '';
}

describe('createLiveProvider', () => {
  it('rejects a missing API key without using network', () => {
    expect(() => createLiveProvider('openai', { apiKey: '', model: 'unit-model' })).toThrow(
      /API key/,
    );
  });

  it('posts OpenAI-compatible chat completions through injected fetch', async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const provider = createLiveProvider('openai', {
      apiKey: 'sk-test',
      model: 'unit-model',
      fetchImpl: (url, init) => {
        calls.push({ url: requestUrl(url), body: requestBody(init) });
        return Promise.resolve(
          jsonResponse({
            choices: [{ message: { content: '{"ok":true}' } }],
            usage: { prompt_tokens: 3, completion_tokens: 5 },
          }),
        );
      },
    });
    const result = await provider.run(request);
    expect(result.text).toBe('{"ok":true}');
    expect(result.inputTokens).toBe(3);
    expect(result.outputTokens).toBe(5);
    expect(calls[0]?.url).toContain('/chat/completions');
    expect(calls[0]?.body).toContain('Create a bar chart');
    expect(calls[0]?.body).not.toContain('sk-test');
  });

  it('reads Anthropic text blocks and Gemini parts', async () => {
    const anthropic = createLiveProvider('anthropic', {
      apiKey: 'ak-test',
      model: 'unit-model',
      fetchImpl: () =>
        Promise.resolve(
          jsonResponse({
            content: [{ type: 'text', text: 'flowchart TD' }],
            usage: { input_tokens: 1, output_tokens: 2 },
          }),
        ),
    });
    expect((await anthropic.run(request)).text).toBe('flowchart TD');
    const geminiCalls: Array<{ url: string; key: string }> = [];
    const gemini = createLiveProvider('gemini', {
      apiKey: 'gk-test',
      model: 'unit-model',
      fetchImpl: (input, init) => {
        geminiCalls.push({ url: requestUrl(input), key: requestHeader(init, 'x-goog-api-key') });
        return Promise.resolve(
          jsonResponse({
            candidates: [{ content: { parts: [{ text: '{"mark":"bar"}' }] } }],
            usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 9 },
          }),
        );
      },
    });
    expect((await gemini.run(request)).text).toBe('{"mark":"bar"}');
    expect(geminiCalls[0]?.url).not.toContain('gk-test');
    expect(geminiCalls[0]?.url).not.toContain('key=');
    expect(geminiCalls[0]?.key).toBe('gk-test');
  });

  it('uses OpenRouter as OpenAI-compatible', async () => {
    let url = '';
    const provider = createLiveProvider('openrouter', {
      apiKey: 'or-test',
      model: 'unit-model',
      fetchImpl: (input) => {
        url = requestUrl(input);
        return Promise.resolve(jsonResponse({ choices: [{ message: { content: '{}' } }] }));
      },
    });
    await provider.run(request);
    expect(url).toContain('openrouter.ai');
  });
});
