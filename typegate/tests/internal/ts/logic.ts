// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.
/* eslint-disable  no-unused-vars */
export const sum = (
  { first, second }: any,
  internals,
  make_internal,
): Promise<any> => {
  console.log(make_internal, internals);

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
