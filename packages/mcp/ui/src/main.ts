import { App, PostMessageTransport } from '@modelcontextprotocol/ext-apps';

import { drawSpec } from './draw-spec.js';
import { extractSpec } from './extract-spec.js';

const chartEl = document.getElementById('chart');
const statusEl = document.getElementById('status');

if (!chartEl || !statusEl) {
  throw new Error('Visulet chart view markup is missing.');
}

const showStatus = (message: string): void => {
  statusEl.hidden = false;
  statusEl.textContent = message;
  chartEl.replaceChildren();
};

const hideStatus = (): void => {
  statusEl.hidden = true;
  statusEl.textContent = '';
};

const handleToolResult = async (result: unknown): Promise<void> => {
  const extracted = extractSpec(result);
  if (!extracted.ok) {
    showStatus(extracted.message);
    return;
  }
  hideStatus();
  try {
    await drawSpec(extracted.spec, chartEl);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : 'unknown error';
    showStatus(`Visulet could not draw this chart: ${detail}`);
  }
};

const start = async (): Promise<void> => {
  const app = new App({ name: 'visulet-chart-view', version: '0.1.0' }, {}, { autoResize: true });
  app.addEventListener('toolinput', () => {
    showStatus('Visulet is loading the chart…');
  });
  app.addEventListener('toolresult', (result) => {
    void handleToolResult(result);
  });
  app.addEventListener('toolcancelled', (params) => {
    showStatus(params.reason ? `Visulet cancelled: ${params.reason}` : 'Visulet chart cancelled.');
  });
  await app.connect(new PostMessageTransport(window.parent, window.parent));
};

void start().catch((error: unknown) => {
  const detail = error instanceof Error ? error.message : 'unknown error';
  showStatus(`Visulet could not connect to the host: ${detail}`);
});
