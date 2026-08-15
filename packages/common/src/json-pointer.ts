export function jsonPointer(segments: readonly (string | number)[]): string {
  if (segments.length === 0) {
    return '';
  }
  return `/${segments
    .map((segment) => String(segment).replaceAll('~', '~0').replaceAll('/', '~1'))
    .join('/')}`;
}

export function splitJsonPointer(pointer: string): string[] | undefined {
  if (pointer === '') {
    return [];
  }
  if (!pointer.startsWith('/')) {
    return undefined;
  }
  return pointer
    .slice(1)
    .split('/')
    .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'));
}
