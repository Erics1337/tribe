import { describe, it, expect } from 'vitest';
import { assertCapacity, nestedCounts, includesTier } from './index.js';
describe('nested circles', () => {
  it('counts inner people in each outer circle', () =>
    expect(
      nestedCounts([{ tier: 'inner' }, { tier: 'close' }, { tier: 'tribe' }, { tier: 'village' }]),
    ).toEqual({ inner: 1, close: 2, tribe: 3, village: 4 }));
  it('limits the complete village to 150', () =>
    expect(() => assertCapacity(Array.from({ length: 151 }, () => ({ tier: 'village' })))).toThrow(
      'Village is full',
    ));
  it('checks intermediate capacity for an inner assignment', () =>
    expect(() =>
      assertCapacity([
        ...Array.from({ length: 15 }, () => ({ tier: 'close' as const })),
        { tier: 'inner' },
      ]),
    ).toThrow('Close is full'));
  it('shares to the chosen circle and its inner layers', () => {
    expect(includesTier('close', 'inner')).toBe(true);
    expect(includesTier('inner', 'close')).toBe(false);
  });
});
