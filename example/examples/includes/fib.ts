const CACHE = [1, 1];
const MAX_CACHE_SIZE = 1000;
export default function fib({ size }: { size: number; }) {
  if (size > MAX_CACHE_SIZE) {
    throw new Error(`unsupported size ${size} > ${MAX_CACHE_SIZE}`);
  }
  let i = CACHE.length;
  while (i++ < size) {
    CACHE.push(CACHE[i - 2] + CACHE[i - 3]);
  }
  return CACHE.slice(0, size);
}
