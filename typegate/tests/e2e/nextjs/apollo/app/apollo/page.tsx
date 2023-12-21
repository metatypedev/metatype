"use client"
import { ApolloClient, InMemoryCache, gql } from "@apollo/client/index";
import { useEffect, useMemo, useState } from "react";

export default function Page() {
  const [result, setResult] = useState(null as string | null);

  const client = useMemo(() => {
    const client = new ApolloClient({
      uri: "http://localhost:7891/apollo_test",
      cache: new InMemoryCache()
    });
    return client;
  }, []);

  const fileContent = "Hello World";
  const file = new File(
    [fileContent],
    "hello.txt",
    { type: "text/plain" },
  );

  useEffect(() => {
    client.mutate({
      mutation: gql`
        mutation ($file: Upload!) {
          upload(file: $file)
        }
      `,
      variables: { file }
    })
      .then((out: any) => setResult(JSON.stringify(out)))
      .catch((err: any) => setResult(JSON.stringify(err)));
  }, []);

  return <>{result}</>;
}
