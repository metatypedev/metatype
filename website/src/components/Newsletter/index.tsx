// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

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
    [tgUrl],
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
        data?.newsletterSignUp?.id ? "Success!" : "Already subscribed!",
      );
    }
  };

  if (message) {
    return message;
  }

  return (
    <form onSubmit={onSubmit}>
      <input
        type="email"
        className="p-1 border border-solid font-sans border-gray-300 rounded-sm text-base"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <input
        type="submit"
        className="p-1 border border-solid font-sans border-gray-300 rounded-sm cursor-pointer text-base bg-transparent"
        value="Submit"
      />
    </form>
  );
}
