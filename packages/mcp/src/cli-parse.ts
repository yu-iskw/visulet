export type CliAction =
  | { type: 'help' }
  | { type: 'version' }
  | { type: 'stdio' }
  | { type: 'http'; port: number; host: string };

export const CLI_USAGE = `Usage:
  npx -y @visulet/mcp
  npx -y @visulet/mcp --transport http --port 3000
  pnpm dlx @visulet/mcp --transport http --port 3000

Options:
  --transport stdio|http   Transport (default: stdio; env VISULET_MCP_TRANSPORT)
  --port <n>               HTTP port (default: 3000; env PORT)
  --host <addr>            HTTP host (default: 127.0.0.1)
  -h, --help               Show this help
  -v, --version            Show version
`;

const parseArg = (argv: string[], flag: string): string | undefined => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};

export const parseTransport = (argv: string[], env: NodeJS.ProcessEnv): 'stdio' | 'http' => {
  const value = parseArg(argv, '--transport') ?? env.VISULET_MCP_TRANSPORT ?? 'stdio';
  return value === 'http' ? 'http' : 'stdio';
};

export const parseCliAction = (argv: string[], env: NodeJS.ProcessEnv): CliAction => {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { type: 'help' };
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    return { type: 'version' };
  }
  if (parseTransport(argv, env) === 'http') {
    return {
      type: 'http',
      port: Number(parseArg(argv, '--port') ?? env.PORT ?? 3000),
      host: parseArg(argv, '--host') ?? '127.0.0.1',
    };
  }
  return { type: 'stdio' };
};
