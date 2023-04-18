// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import MiniQL, { MiniQLProps } from "@site/src/components/MiniQL";
import React from "react";

interface TGExampleProps extends MiniQLProps {
  python: { content: string; path: string };
}

export default function TGExample({ python, ...props }: TGExampleProps) {
  return (
    <MiniQL
      code={python.content}
      codeLanguage="python"
      codeFileUrl={python.path}
      {...props}
    />
  );
}
