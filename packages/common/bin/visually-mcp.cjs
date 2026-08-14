#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { compileDocument, supportedPhase0Families, validateDocument } = require('../dist/index.js');

const SERVER_INFO = { name: 'visually', version: '0.1.0' };
const APP_RESOURCE_URI = 'ui://visually/renderer.html';
const APP_MIME_TYPE = 'text/html;profile=mcp-app';
const MODERN_PROTOCOL = '2026-07-28';
const LEGACY_PROTOCOL = '2025-11-25';
const legacyProtocols = new Set(['2024-11-05', '2025-03-26', '2025-06-18', LEGACY_PROTOCOL]);
const appHtml = fs.readFileSync(path.join(__dirname, '../app/renderer.html'), 'utf8');

const documentInputSchema = {
  type: 'object',
  properties: {
    document: {
      type: 'object',
      description: 'Canonical Visually VisualDocument v0.1 object. Use the repository JSON Schema for full authoring guidance.',
    },
  },
  required: ['document'],
  additionalProperties: false,
};

const diagnosticsOutputSchema = {
  type: 'object',
  properties: {
    valid: { type: 'boolean' },
    diagnostics: { type: 'array', items: { type: 'object' } },
  },
  required: ['valid', 'diagnostics'],
};

const tools = [
  {
    name: 'visually.render',
    title: 'Render VisualDocument',
    description: 'Validate a VisualDocument and compile it into a self-contained HTML/SVG artifact.',
    inputSchema: documentInputSchema,
    outputSchema: {
      ...diagnosticsOutputSchema,
      properties: { ...diagnosticsOutputSchema.properties, html: { type: 'string' } },
    },
    _meta: { ui: { resourceUri: APP_RESOURCE_URI } },
  },
  {
    name: 'visually.validate',
    title: 'Validate VisualDocument',
    description: 'Run Phase 0 structural, semantic, and reference validation without rendering.',
    inputSchema: documentInputSchema,
    outputSchema: diagnosticsOutputSchema,
  },
  {
    name: 'visually.capabilities',
    title: 'List Phase 0 capabilities',
    description: 'Return the visual families currently implemented by the dependency-free Phase 0 backend.',
    inputSchema: { type: 'object', additionalProperties: false },
    outputSchema: { type: 'object' },
  },
];

function complete(result) {
  return { resultType: 'complete', ...result };
}

function success(id, result) {
  return { jsonrpc: '2.0', id, result: complete(result) };
}

function failure(id, code, message, data) {
  const error = data === undefined ? { code, message } : { code, message, data };
  return { jsonrpc: '2.0', id, error };
}

function toolText(text) {
  return [{ type: 'text', text }];
}

function validateTool(argumentsValue) {
  const document = argumentsValue?.document;
  const validation = validateDocument(document);
  return {
    content: toolText(validation.valid ? 'VisualDocument is valid for Phase 0.' : 'VisualDocument validation failed.'),
    structuredContent: { valid: validation.valid, diagnostics: validation.diagnostics },
    isError: !validation.valid,
  };
}

function renderTool(argumentsValue) {
  const result = compileDocument(argumentsValue?.document);
  const structuredContent = {
    valid: result.valid,
    diagnostics: result.diagnostics,
    ...(result.html === undefined ? {} : { html: result.html }),
  };
  return {
    content: toolText(
      result.valid
        ? `Rendered VisualDocument as self-contained HTML (${result.diagnostics.length} diagnostic(s)).`
        : 'VisualDocument could not be rendered; inspect structuredContent.diagnostics.',
    ),
    structuredContent,
    isError: !result.valid,
  };
}

function capabilitiesTool() {
  const capabilities = supportedPhase0Families();
  return {
    content: toolText(JSON.stringify(capabilities)),
    structuredContent: capabilities,
    isError: false,
  };
}

function callTool(params) {
  const name = params?.name;
  const argumentsValue = params?.arguments;
  if (name === 'visually.render') return renderTool(argumentsValue);
  if (name === 'visually.validate') return validateTool(argumentsValue);
  if (name === 'visually.capabilities') return capabilitiesTool();
  return undefined;
}

function discover() {
  return complete({
    supportedVersions: [MODERN_PROTOCOL],
    capabilities: {
      tools: { listChanged: false },
      resources: { listChanged: false },
      extensions: {
        'io.modelcontextprotocol/ui': { mimeTypes: [APP_MIME_TYPE] },
      },
    },
    serverInfo: SERVER_INFO,
    instructions:
      'Use visually.render for HTML/SVG output, visually.validate before iterative edits, and visually.capabilities for the compact Phase 0 feature set.',
  });
}

function initialize(params) {
  const requested = params?.protocolVersion;
  const protocolVersion = typeof requested === 'string' && legacyProtocols.has(requested) ? requested : LEGACY_PROTOCOL;
  return {
    protocolVersion,
    capabilities: {
      tools: { listChanged: false },
      resources: { listChanged: false },
      extensions: {
        'io.modelcontextprotocol/ui': { mimeTypes: [APP_MIME_TYPE] },
      },
    },
    serverInfo: SERVER_INFO,
    instructions:
      'Visually Phase 0 provides dependency-free VisualDocument validation and HTML/SVG rendering.',
  };
}

function resourcesList() {
  return {
    resources: [
      {
        uri: APP_RESOURCE_URI,
        name: 'Visually renderer',
        title: 'Visually Renderer',
        description: 'MCP App view for VisualDocument render results.',
        mimeType: APP_MIME_TYPE,
      },
    ],
  };
}

function resourcesRead(params) {
  if (params?.uri !== APP_RESOURCE_URI) return undefined;
  return {
    contents: [
      {
        uri: APP_RESOURCE_URI,
        mimeType: APP_MIME_TYPE,
        text: appHtml,
        _meta: { ui: { csp: {} } },
      },
    ],
  };
}

function handleRequest(message) {
  const id = message.id;
  if (id === undefined) return undefined;
  switch (message.method) {
    case 'server/discover':
      return { jsonrpc: '2.0', id, result: discover() };
    case 'initialize':
      return { jsonrpc: '2.0', id, result: initialize(message.params) };
    case 'ping':
      return success(id, {});
    case 'tools/list':
      return success(id, { tools });
    case 'tools/call': {
      const result = callTool(message.params);
      return result === undefined ? failure(id, -32602, `Unknown tool: ${String(message.params?.name ?? '')}`) : success(id, result);
    }
    case 'resources/list':
      return success(id, resourcesList());
    case 'resources/templates/list':
      return success(id, { resourceTemplates: [] });
    case 'resources/read': {
      const result = resourcesRead(message.params);
      return result === undefined ? failure(id, -32602, `Unknown resource: ${String(message.params?.uri ?? '')}`) : success(id, result);
    }
    default:
      return failure(id, -32601, `Method not found: ${String(message.method ?? '')}`);
  }
}

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '') continue;
    try {
      const message = JSON.parse(line);
      const response = handleRequest(message);
      if (response !== undefined) writeMessage(response);
    } catch (error) {
      writeMessage(failure(undefined, -32700, 'Parse error', error instanceof Error ? error.message : String(error)));
    }
  }
});
