// Minimal big-number type for the "Numbers Go Up" mini-game. Exponential
// growth blows past Luau/JS safe-integer precision (2^53) within a minute,
// so the value is stored as mantissa × 10^exponent and never as a plain
// number. Normalized so that either it's exactly zero, or 1 ≤ |m| < 10 —
// which makes leaderboard ranking a simple (exponent DESC, mantissa DESC).

export interface BigNum {
  /** Mantissa. Normalized to 1 ≤ |m| < 10, except zero which is {m:0,e:0}. */
  m: number;
  /** Base-10 exponent. */
  e: number;
}

export const BN_ZERO: BigNum = { m: 0, e: 0 };

/** Normalize an unnormalized (m, e) pair into canonical form. */
export function bnNorm(m: number, e: number): BigNum {
  if (!isFinite(m) || m === 0) return { m: 0, e: 0 };
  let sign = m < 0 ? -1 : 1;
  let am = Math.abs(m);
  // Pull powers of ten into the exponent until 1 ≤ am < 10.
  let exp = Math.floor(Math.log10(am));
  am = am / Math.pow(10, exp);
  // Floating error can leave am just below 1 or at 10; clamp.
  if (am >= 10) { am /= 10; exp += 1; }
  if (am < 1) { am *= 10; exp -= 1; }
  return { m: sign * am, e: e + exp };
}

/** Build a BigNum from a normal JS number. */
export function bnFromNumber(n: number): BigNum {
  if (!isFinite(n) || n === 0) return { m: 0, e: 0 };
  return bnNorm(n, 0);
}

/** Convert to a plain number — only safe for small values; large ones
 *  overflow to Infinity. Used for thresholds comparisons internally and
 *  small-value display. */
export function bnToNumber(b: BigNum): number {
  return b.m * Math.pow(10, b.e);
}

/** Compare two non-negative BigNums. Returns -1, 0, or 1. */
export function bnCmp(a: BigNum, b: BigNum): number {
  // Zero handling.
  const az = a.m === 0, bz = b.m === 0;
  if (az && bz) return 0;
  if (az) return b.m > 0 ? -1 : 1;
  if (bz) return a.m > 0 ? 1 : -1;
  // Same sign assumed non-negative for this game; compare by exponent then mantissa.
  if (a.e !== b.e) return a.e < b.e ? -1 : 1;
  if (a.m < b.m) return -1;
  if (a.m > b.m) return 1;
  return 0;
}

export function bnGte(a: BigNum, b: BigNum): boolean {
  return bnCmp(a, b) >= 0;
}

export function bnMax(a: BigNum, b: BigNum): BigNum {
  return bnCmp(a, b) >= 0 ? a : b;
}

/** Add two BigNums. */
export function bnAdd(a: BigNum, b: BigNum): BigNum {
  if (a.m === 0) return b;
  if (b.m === 0) return a;
  const hi = a.e >= b.e ? a : b;
  const lo = a.e >= b.e ? b : a;
  const diff = hi.e - lo.e;
  // If the smaller term is more than ~16 orders of magnitude down it can't
  // affect the double-precision mantissa — drop it.
  if (diff > 16) return hi;
  const m = hi.m + lo.m * Math.pow(10, -diff);
  return bnNorm(m, hi.e);
}

/** Multiply two BigNums. */
export function bnMul(a: BigNum, b: BigNum): BigNum {
  if (a.m === 0 || b.m === 0) return { m: 0, e: 0 };
  return bnNorm(a.m * b.m, a.e + b.e);
}

/** Multiply by g^steps where g is a small positive growth factor and steps
 *  can be large — computed in log space so g^steps never overflows. */
export function bnMulByPow(b: BigNum, g: number, steps: number): BigNum {
  if (b.m === 0 || steps <= 0 || g === 1) return b;
  const addE = steps * Math.log10(g);
  const whole = Math.floor(addE);
  const frac = addE - whole;
  return bnNorm(b.m * Math.pow(10, frac), b.e + whole);
}

const SUFFIXES = [
  '', 'K', 'M', 'B', 'T',
  'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc',
  'Vg', 'UVg', 'DVg', 'TVg', 'QaVg', 'QiVg', 'SxVg', 'SpVg', 'OcVg', 'NoVg',
];

/** Human-readable string: integer/plain for tiny values, suffixed (1.23M)
 *  through the suffix table, then scientific (1.23e45) beyond it. */
export function bnFormat(b: BigNum): string {
  if (b.m === 0) return '0';
  const sign = b.m < 0 ? '-' : '';
  const e = b.e;
  // Small magnitudes: render the actual number so 0,1,2,…,10,16,32 look right.
  if (e < 6) {
    const val = Math.abs(bnToNumber(b));
    // Whole numbers print clean; fractional show up to 2 decimals.
    const rounded = Math.round(val * 100) / 100;
    const str = Number.isInteger(rounded)
      ? rounded.toLocaleString('en-US')
      : rounded.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return sign + str;
  }
  const group = Math.floor(e / 3);
  if (group < SUFFIXES.length) {
    const within = Math.abs(b.m) * Math.pow(10, e - group * 3);
    return sign + within.toFixed(2) + SUFFIXES[group];
  }
  // Beyond the named suffixes — scientific notation.
  return sign + Math.abs(b.m).toFixed(2) + 'e' + e;
}

/** Serialize for localStorage (JSON-safe already, but explicit for clarity). */
export function bnToJSON(b: BigNum): { m: number; e: number } {
  return { m: b.m, e: b.e };
}

/** Parse from stored / untrusted data, with a safe fallback to zero. */
export function bnFromJSON(v: unknown): BigNum {
  if (v && typeof v === 'object') {
    const o = v as { m?: unknown; e?: unknown };
    if (typeof o.m === 'number' && typeof o.e === 'number' && isFinite(o.m) && isFinite(o.e)) {
      return bnNorm(o.m, o.e);
    }
  }
  return { m: 0, e: 0 };
}
