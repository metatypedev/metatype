// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type { NextApiRequest, NextApiResponse } from "next";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client/index";
import createUploadLink from "apollo-upload-client/createUploadLink.mjs";
import process from "process";

type ResponseData = {
  message: string;
};

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  const tgPort = process.env.TG_PORT;
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    // Does FormData.append stuff and enables File Upload
    // Please refer to https://github.com/jaydenseric/apollo-upload-client/blob/master/createUploadLink.mjs
    // Note: if link and uri are both provided, link takes precedence
    link: createUploadLink({ uri: `http://localhost:${tgPort}/apollo` }),
  });

  try {
    const result = await client.mutate({
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
    });
    res.status(200).json({ success: result });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
