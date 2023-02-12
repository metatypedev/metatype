// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import MiniQL, { MiniQLProps } from "@site/src/components/MiniQL";
import CodeBlock from "@theme-original/CodeBlock";
import React from "react";

interface TGExampleProps extends MiniQLProps {
  python: string;
}

export default function TGExample({ python, ...props }: TGExampleProps) {
  return (
    <MiniQL
      panel={<CodeBlock language="python">{python}</CodeBlock>}
      {...props}
    />
  );
}
