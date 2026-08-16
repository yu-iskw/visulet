import { describe, expect, it } from 'vitest';

import { formatTick, niceDomain, niceTicks, sequentialBlue } from './svg-plot';

describe('svg plot helpers', () => {
  it('emits 1-2-5 nice ticks covering the domain', () => {
    const ticks = niceTicks(0, 19.3, 4);
    expect(ticks[0]).toBeLessThanOrEqual(0);
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(19.3);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
  });

  it('formats compact tick labels', () => {
    expect(formatTick(0)).toBe('0');
    expect(formatTick(19.3)).toBe('19.3');
    expect(formatTick(1000)).toBe('1000');
  });

  it('expands a domain to nice tick endpoints', () => {
    const domain = niceDomain(42, 97);
    expect(domain.min).toBeLessThanOrEqual(42);
    expect(domain.max).toBeGreaterThanOrEqual(97);
    expect(niceTicks(domain.min, domain.max).at(0)).toBe(domain.min);
    expect(niceTicks(domain.min, domain.max).at(-1)).toBe(domain.max);
  });

  it('ramps sequential blues from pale to ink', () => {
    expect(sequentialBlue(0)).toBe('#f7fbff');
    expect(sequentialBlue(1)).toBe('#08306b');
    expect(sequentialBlue(0.5)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
