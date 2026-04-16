/**
 * Build a deterministic seed so preview intervals and persisted scheduling
 * always use the same fuzz input for the same user-item pair.
 */
export function buildFsrsDeterministicSeed(userId: string, itemId: string | number): number {
  const head = userId.replace(/[^0-9a-f]/gi, '').slice(0, 8);

  // Fallback hash keeps deterministic behavior even when userId has no hex prefix.
  const userSeed = head.length > 0
    ? parseInt(head, 16)
    : userId.split('').reduce((acc, ch) => ((acc * 33) ^ ch.charCodeAt(0)) >>> 0, 5381);

  return (userSeed ^ (Number(itemId) * 1103515245 + 12345)) >>> 0;
}
