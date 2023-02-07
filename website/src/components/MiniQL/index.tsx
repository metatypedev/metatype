// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import React, { useMemo } from "react";
import { createGraphiQLFetcher } from "@graphiql/toolkit";
import BrowserOnly from "@docusaurus/BrowserOnly";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import { GraphiQLProvider } from "@graphiql/react";
import GraphiQLInterface, { Tab } from "./GraphiQLInterface";
import * as ast from "graphql/language/ast";
import { MemoryStorage } from "./MemoryStore";

interface MiniQLProps {
  typegraph: string;
  query: ast.DocumentNode;
  headers: Record<string, unknown>;
  variables: Record<string, unknown>;
  tab: Tab;
}

export default function MiniQL({
  typegraph,
  query,
  headers = {},
  variables = {},
  tab = "",
}: MiniQLProps) {
  const {
    siteConfig: {
      customFields: { tgUrl },
    },
  } = useDocusaurusContext();

  const storage = useMemo(() => new MemoryStorage(), []);
  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => {
        const fetcher = useMemo(
          () =>
            createGraphiQLFetcher({
              url: `${tgUrl}/${typegraph}`,
            }),
          [],
        );
        return (
          <GraphiQLProvider
            fetcher={fetcher}
            defaultQuery={query.loc.source.body}
            defaultHeaders={JSON.stringify(headers)}
            variables={JSON.stringify(variables)}
            storage={storage}
          >
            <GraphiQLInterface defaultTab={tab} />
          </GraphiQLProvider>
        );
      }}
    </BrowserOnly>
  );
}
