import { describe, expect, it } from 'vitest';
import { buildFsrsDeterministicSeed } from '@/lib/services/fsrsSeed';

describe('buildFsrsDeterministicSeed', () => {
  it('returns stable seed for the same inputs', () => {
    const a = buildFsrsDeterministicSeed('123e4567-e89b-12d3-a456-426614174000', '42');
    const b = buildFsrsDeterministicSeed('123e4567-e89b-12d3-a456-426614174000', '42');
    expect(a).toBe(b);
  });

  it('accepts both number and string item id consistently', () => {
    const fromString = buildFsrsDeterministicSeed('123e4567-e89b-12d3-a456-426614174000', '7');
    const fromNumber = buildFsrsDeterministicSeed('123e4567-e89b-12d3-a456-426614174000', 7);
    expect(fromString).toBe(fromNumber);
  });

  it('uses deterministic fallback hashing when user id has no hex chars', () => {
    const a = buildFsrsDeterministicSeed('user_alpha', 1);
    const b = buildFsrsDeterministicSeed('user_alpha', 1);
    const c = buildFsrsDeterministicSeed('user_beta', 1);

    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
