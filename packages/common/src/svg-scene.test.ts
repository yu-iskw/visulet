import { describe, expect, it } from 'vitest';

import { escapeXml, serializeSvgScene, svgNode } from './svg-scene';

describe('svg scene', () => {
  it('serializes text with XML escaping and omits hover from markup', () => {
    const scene = svgNode('text', { x: 8, y: 18 }, 'Q1 <sales>', 'Q1 · 10');
    expect(escapeXml('Q1 <sales>')).toBe('Q1 &lt;sales&gt;');
    expect(serializeSvgScene(scene)).toBe('<text x="8" y="18">Q1 &lt;sales&gt;</text>');
    expect(serializeSvgScene(scene)).not.toContain('hover');
  });

  it('self-closes empty drawing tags', () => {
    expect(serializeSvgScene(svgNode('rect', { x: 1, width: 2 }))).toBe('<rect x="1" width="2"/>');
  });
});
