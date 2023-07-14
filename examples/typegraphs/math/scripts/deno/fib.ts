
interface DefaultInput {
  size: number;
}

export default function({ size }: DefaultInput,
  { context }: { context: Record<string, unknown> }): Array<number>
{
  return [];
}
