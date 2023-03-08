// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

export const remoteSum = async (
  { first, second }: any,
  _context,
  { gql },
): Promise<any> => {
  const { data } = await gql`
    query q($first: Float!, $second: Float!) {
      sum(first: $first, second: $second)
    }
  `.run({
    first,
    second,
  });
  return data.sum;
};

export const sum = (
  { first, second }: any,
): Promise<any> => {
  return first + second;
};
