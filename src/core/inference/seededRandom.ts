const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const UINT32_RANGE = 0x100000000;
const MULBERRY_INCREMENT = 0x6d2b79f5;
const MULBERRY_ODD_MASK = 1;
const MULBERRY_MIX_MASK = 61;

/** 32-bit FNV-1a over bytes. Deterministic across runs and platforms. */
export function fnv1a(bytes: Uint8Array, seed: number = FNV_OFFSET_BASIS): number {
  let hash = seed >>> 0;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash;
}

/** Mulberry32 PRNG. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY_INCREMENT) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | MULBERRY_ODD_MASK);
    t ^= t + Math.imul(t ^ (t >>> 7), t | MULBERRY_MIX_MASK);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  };
}
