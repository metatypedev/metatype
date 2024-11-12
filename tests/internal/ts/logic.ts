// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

export const remoteSum = async (
  { first, second }: any,
  _context: any,
  { gql }: any,
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
