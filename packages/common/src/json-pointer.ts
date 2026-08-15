export function jsonPointer(segments: readonly (string | number)[]): string {
  if (segments.length === 0) {
    return '';
  }
  return `/${segments
    .map((segment) => String(segment).replaceAll('~', '~0').replaceAll('/', '~1'))
    .join('/')}`;
}
