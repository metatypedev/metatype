// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.
/* eslint-disable  no-unused-vars */
export const sum = (
  { first, second }: any,
  { key },
  make_internal,
): Promise<any> => {
  make_internal();
  console.log(key);
  return first + second;
  // const {data} = await gql`
  // query A {
  //   ...
  // }
  // `.run({
  //   variables: {

  //   }
  // })
};
