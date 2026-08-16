import { registerAppResource, registerAppTool } from '@modelcontextprotocol/ext-apps/server';

import type { McpServer } from '@modelcontextprotocol/server';

type AppToolHandler = (args: unknown) => Promise<unknown>;
type AppResourceReader = () => Promise<{
  contents: { uri: string; mimeType: string; text: string }[];
}>;

export const registerVisuletAppTool = (
  server: McpServer,
  name: string,
  config: object,
  handler: AppToolHandler,
): void => {
  (
    registerAppTool as unknown as (
      mcpServer: McpServer,
      toolName: string,
      toolConfig: object,
      callback: AppToolHandler,
    ) => void
  )(server, name, config, handler);
};

export const registerVisuletAppResource = (
  server: McpServer,
  name: string,
  uri: string,
  config: object,
  readCallback: AppResourceReader,
): void => {
  (
    registerAppResource as unknown as (
      mcpServer: McpServer,
      resourceName: string,
      resourceUri: string,
      resourceConfig: object,
      callback: AppResourceReader,
    ) => void
  )(server, name, uri, config, readCallback);
};
