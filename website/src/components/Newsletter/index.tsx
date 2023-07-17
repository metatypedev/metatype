// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import React, { useMemo, useState } from "react";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

const signUp = gql`
  mutation docs($email: String!) {
    newsletterSignUp(email: $email) {
      id
    }
  }
`;

export function useClient(gate: string) {
  const {
    siteConfig: {
      customFields: { tgUrl },
    },
  } = useDocusaurusContext();

  const client = useMemo(
    () =>
      new ApolloClient({
        uri: `${tgUrl}/${gate}`,
        cache: new InMemoryCache(),
      }),
    [tgUrl]
  );

  return client;
}

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const client = useClient("docs");

  const onSubmit = async (e) => {
    e.preventDefault();
    if (email.length > 0) {
      const { data } = await client.mutate({
        mutation: signUp,
        variables: { email },
      });
      setMessage(
        data?.newsletterSignUp?.id ? "Success!" : "Already subscribed!"
      );
    }
  };

  if (message) {
    return message;
  }

  return (
    <form onSubmit={onSubmit} className="inline-block rounded-lg overflow-clip">
      <input
        type="email"
        className="px-2 py-2 font-sans bg-slate-100 border-none text-base"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <input
        type="submit"
        className="py-2 px-2 border-none cursor-pointer text-base bg-slate-500 text-white"
        value="Submit"
      />
    </form>
  );
}
