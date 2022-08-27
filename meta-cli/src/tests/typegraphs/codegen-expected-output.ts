interface DivInput {
  dividend: number;
  divisor: number;
}

export function div({ dividend, divisor }: DivInput): {
  quotient: number;
  remainder: number;
} {
  return { quotient: 0, remainder: 0 };
}
