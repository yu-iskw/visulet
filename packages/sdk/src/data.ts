import { readFileSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { recordGet, recordSet } from './record.js';
import { MAX_DATA_FILE_BYTES } from './types.js';

const parseCell = (raw: string): string | number => {
  if (raw === '') {
    return raw;
  }
  const asNumber = Number(raw);
  return Number.isFinite(asNumber) && raw === String(asNumber) ? asNumber : raw;
};

export const parseDelimited = (text: string, delimiter = ','): Record<string, unknown>[] => {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0]?.split(delimiter).map((item) => item.trim()) ?? [];
  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter);
    const row: Record<string, unknown> = {};
    header.forEach((key, index) => {
      const cell = recordGet(cells, index);
      const raw = typeof cell === 'string' ? cell.trim() : '';
      recordSet(row, key, parseCell(raw));
    });
    return row;
  });
};

const valuesFromJson = (json: unknown): Record<string, unknown>[] => {
  if (Array.isArray(json)) {
    return json as Record<string, unknown>[];
  }
  if (json && typeof json === 'object' && 'values' in json) {
    return (json as { values: Record<string, unknown>[] }).values;
  }
  throw new Error('Unsupported data file shape.');
};

const toLocalPath = (url: string): string => {
  if (url.startsWith('file:')) {
    return fileURLToPath(url);
  }
  return resolve(url);
};

export const readBoundedFile = (filePath: string): string => {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is stat'd as a regular file under MAX_DATA_FILE_BYTES
  const stats = statSync(filePath);
  if (!stats.isFile()) {
    throw new Error('Data path must be a regular file.');
  }
  if (stats.size > MAX_DATA_FILE_BYTES) {
    throw new Error('Data file exceeds 10 MB.');
  }
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- same bounded path as the stat above
  return readFileSync(filePath, 'utf8');
};

export const loadLocalDataValues = (url: string): Record<string, unknown>[] => {
  if (/^https?:\/\//i.test(url)) {
    throw new Error('Remote data URLs are not fetched.');
  }
  const filePath = toLocalPath(url);
  const text = readBoundedFile(filePath);
  const ext = extname(filePath).toLowerCase();
  if (ext === '.csv') {
    return parseDelimited(text, ',');
  }
  if (ext === '.tsv') {
    return parseDelimited(text, '\t');
  }
  return valuesFromJson(JSON.parse(text) as unknown);
};
