// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type { NextApiRequest, NextApiResponse } from "next";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client/index";

type ResponseData = {
  message: string;
};

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  const client = new ApolloClient({
    uri: "http://localhost:7890/apollo_test",
    cache: new InMemoryCache(),
  });

  const fileContent = "Hello World";
  const file = new File(
    [fileContent],
    "hello.txt",
    { type: "text/plain" },
  );

  client.mutate({
    mutation: gql`
      mutation ($file: Upload!) {
        upload(file: $file)
      }
    `,
    variables: { file },
  })
    .then((out: any) => res.status(200).json(out))
    .catch((err: any) => res.status(400).json(err));
}
