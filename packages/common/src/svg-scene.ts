export interface SvgSceneNode {
  readonly tag: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly text?: string;
  readonly children?: readonly SvgSceneNode[];
  readonly hover?: string;
}

export function svgNode(
  tag: string,
  attrs: Readonly<Record<string, string | number | undefined>> = {},
  content?: string | readonly SvgSceneNode[],
  hover?: string,
): SvgSceneNode {
  const normalized: Record<string, string> = Object.fromEntries(
    Object.entries(attrs).flatMap(([key, value]) => {
      if (value === undefined) {
        return [];
      }
      const text = String(value);
      return text === '' ? [] : [[key, text]];
    }),
  );
  const node: SvgSceneNode = { tag, attrs: normalized };
  if (typeof content === 'string') {
    return hover === undefined ? { ...node, text: content } : { ...node, text: content, hover };
  }
  if (content !== undefined && content.length > 0) {
    return hover === undefined
      ? { ...node, children: content }
      : { ...node, children: content, hover };
  }
  return hover === undefined ? node : { ...node, hover };
}

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function serializeAttrs(attrs: Readonly<Record<string, string>>): string {
  return Object.entries(attrs)
    .map(([key, value]) => ` ${key}="${escapeXml(value)}"`)
    .join('');
}

export function serializeSvgScene(node: SvgSceneNode): string {
  const inner =
    node.text === undefined
      ? (node.children ?? []).map((child) => serializeSvgScene(child)).join('')
      : escapeXml(node.text);
  if (inner === '' && node.tag !== 'text' && node.tag !== 'style') {
    return `<${node.tag}${serializeAttrs(node.attrs)}/>`;
  }
  return `<${node.tag}${serializeAttrs(node.attrs)}>${inner}</${node.tag}>`;
}
