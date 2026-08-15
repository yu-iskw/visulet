import { isRecord, optionalFiniteNumber } from '@visulet/core';

import type { ModelProvider, ModelRunRequest, ModelRunResult } from '@visulet/benchmark';

export type LiveProviderId = 'openai' | 'anthropic' | 'gemini' | 'openrouter';

export const LIVE_PROVIDER_IDS = [
  'openai',
  'anthropic',
  'gemini',
  'openrouter',
] as const satisfies readonly LiveProviderId[];

export type FetchImpl = typeof fetch;

export interface LiveProviderOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly fetchImpl?: FetchImpl;
  readonly baseUrl?: string;
}

function requireApiKey(apiKey: string): string {
  if (apiKey.trim().length === 0) {
    throw new Error('API key is required');
  }
  return apiKey;
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return isRecord(value) ? value : undefined;
}

async function postJson(
  fetchImpl: FetchImpl,
  url: string,
  headers: Readonly<Record<string, string>>,
  body: unknown,
): Promise<unknown> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`Provider HTTP ${String(response.status)}`);
  }
  return payload;
}

function firstArrayItem(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : undefined;
}

function openAiText(payload: unknown): string {
  const choice = asRecord(firstArrayItem(asRecord(payload)?.choices));
  const message = asRecord(choice?.message);
  return typeof message?.content === 'string' ? message.content : '';
}

function anthropicText(payload: unknown): string {
  const block = asRecord(firstArrayItem(asRecord(payload)?.content));
  return typeof block?.text === 'string' ? block.text : '';
}

function geminiText(payload: unknown): string {
  const candidate = asRecord(firstArrayItem(asRecord(payload)?.candidates));
  const part = asRecord(firstArrayItem(asRecord(candidate?.content)?.parts));
  return typeof part?.text === 'string' ? part.text : '';
}

function elapsed(started: number, result: Partial<ModelRunResult>, text: string): ModelRunResult {
  return {
    text,
    latencyMs: result.latencyMs ?? Date.now() - started,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}

function createOpenAiCompatibleProvider(
  id: 'openai' | 'openrouter',
  options: LiveProviderOptions,
): ModelProvider {
  const apiKey = requireApiKey(options.apiKey);
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl =
    options.baseUrl ??
    (id === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1');
  return {
    id,
    async run(request: ModelRunRequest): Promise<ModelRunResult> {
      const started = Date.now();
      const payload = await postJson(
        fetchImpl,
        `${baseUrl}/chat/completions`,
        { authorization: `Bearer ${apiKey}` },
        {
          model: request.model ?? options.model,
          temperature: request.temperature ?? 0,
          max_tokens: request.maxOutputTokens,
          messages: [
            ...(request.system === undefined ? [] : [{ role: 'system', content: request.system }]),
            { role: 'user', content: request.prompt },
          ],
        },
      );
      const usage = asRecord(payload)?.usage;
      const usageRecord = asRecord(usage);
      return elapsed(
        started,
        {
          inputTokens: optionalFiniteNumber(usageRecord?.prompt_tokens),
          outputTokens: optionalFiniteNumber(usageRecord?.completion_tokens),
        },
        openAiText(payload),
      );
    },
  };
}

function createAnthropicProvider(options: LiveProviderOptions): ModelProvider {
  const apiKey = requireApiKey(options.apiKey);
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? 'https://api.anthropic.com';
  return {
    id: 'anthropic',
    async run(request: ModelRunRequest): Promise<ModelRunResult> {
      const started = Date.now();
      const payload = await postJson(
        fetchImpl,
        `${baseUrl}/v1/messages`,
        { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        {
          model: request.model ?? options.model,
          max_tokens: request.maxOutputTokens ?? 4096,
          temperature: request.temperature ?? 0,
          system: request.system,
          messages: [{ role: 'user', content: request.prompt }],
        },
      );
      const usage = asRecord(asRecord(payload)?.usage);
      return elapsed(
        started,
        {
          inputTokens: optionalFiniteNumber(usage?.input_tokens),
          outputTokens: optionalFiniteNumber(usage?.output_tokens),
        },
        anthropicText(payload),
      );
    },
  };
}

function createGeminiProvider(options: LiveProviderOptions): ModelProvider {
  const apiKey = requireApiKey(options.apiKey);
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? 'https://generativelanguage.googleapis.com';
  const model = options.model;
  return {
    id: 'gemini',
    async run(request: ModelRunRequest): Promise<ModelRunResult> {
      const started = Date.now();
      const payload = await postJson(
        fetchImpl,
        `${baseUrl}/v1beta/models/${encodeURIComponent(request.model ?? model)}:generateContent`,
        { 'x-goog-api-key': apiKey },
        {
          contents: [
            {
              parts: [
                {
                  text:
                    request.system === undefined
                      ? request.prompt
                      : `${request.system}\n\n${request.prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: request.temperature ?? 0,
            maxOutputTokens: request.maxOutputTokens,
          },
        },
      );
      const usage = asRecord(asRecord(payload)?.usageMetadata);
      return elapsed(
        started,
        {
          inputTokens: optionalFiniteNumber(usage?.promptTokenCount),
          outputTokens: optionalFiniteNumber(usage?.candidatesTokenCount),
        },
        geminiText(payload),
      );
    },
  };
}

export function createLiveProvider(
  id: LiveProviderId,
  options: LiveProviderOptions,
): ModelProvider {
  switch (id) {
    case 'openai':
    case 'openrouter':
      return createOpenAiCompatibleProvider(id, options);
    case 'anthropic':
      return createAnthropicProvider(options);
    case 'gemini':
      return createGeminiProvider(options);
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}
