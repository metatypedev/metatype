// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type { NextApiRequest, NextApiResponse } from "next";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client/index";
import createUploadLink from "apollo-upload-client/createUploadLink.mjs";

type ResponseData = {
  message: string;
};

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    // Does FormData.append stuff and enables File Upload
    // Please refer to https://github.com/jaydenseric/apollo-upload-client/blob/master/createUploadLink.mjs
    // Note: if link and uri are both provided, link takes precedence
    link: createUploadLink({ uri: "http://localhost:7897/apollo" })
  });

  client.mutate({
    mutation: gql`
      mutation ($files: [File]!, $prefix: String!) {
        uploadMany(files: $files, prefix: $prefix)
      }
    `,
    variables: {
      files: [1, 2, 3, 4].map((i) =>
        new File([`hello #${i}`], `hello-${i}.txt`, { type: "text/plain" })
      ),
      prefix: "user/",
    },
  })
    .then((out: any) => res.status(200).json({ success: out } as any))
    .catch((err: any) => res.status(400).json({ error: err!.message } as any));
}
