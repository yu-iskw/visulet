import { isRecord } from '@visulet/core';

import { MCP_UI_PREVIEW_URI, MCP_UI_TOOL_NAMES, type McpToolResponse } from './tools';

export function isUiAppTool(name: string): name is (typeof MCP_UI_TOOL_NAMES)[number] {
  return MCP_UI_TOOL_NAMES.some((tool) => tool === name);
}

export function uiToolMeta(): Readonly<Record<string, unknown>> {
  return {
    ui: { resourceUri: MCP_UI_PREVIEW_URI },
    // SEP-1865 drafts used a slash key; Cursor and current hosts read ui.resourceUri.
    'ui/resourceUri': MCP_UI_PREVIEW_URI,
  };
}

function structuredContentFor(
  name: (typeof MCP_UI_TOOL_NAMES)[number],
  response: McpToolResponse,
): Readonly<Record<string, unknown>> {
  const payload = isRecord(response.result) ? response.result : {};
  switch (name) {
    case 'visual_preview':
    case 'visual_apply_patch':
      return { ...payload, diagnostics: response.diagnostics };
    case 'visual_inspect':
      return {
        outline: payload,
        diagnostics: response.diagnostics,
      };
    default: {
      const exhaustive: never = name;
      return exhaustive;
    }
  }
}

export function shapeCallToolResult(
  name: string,
  response: McpToolResponse,
): Readonly<Record<string, unknown>> {
  if (!isUiAppTool(name)) {
    return {
      content: [{ type: 'text', text: JSON.stringify(response) }],
      isError: !response.ok,
    };
  }
  const summary = response.ok
    ? `Interactive ${name.replaceAll('_', ' ')} ready`
    : `${name} failed: ${response.category}`;
  return {
    content: [{ type: 'text', text: summary }],
    structuredContent: structuredContentFor(name, response),
    _meta: uiToolMeta(),
    isError: !response.ok,
  };
}
