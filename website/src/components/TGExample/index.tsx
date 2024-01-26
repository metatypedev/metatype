// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import MiniQL, { MiniQLProps } from "@site/src/components/MiniQL";
import React from "react";

interface TGExampleProps extends MiniQLProps {
  python?: { content: string; path: string };
  typescript?: { content: string; path: string}
}

export default function TGExample({ python, typescript, ...props }: TGExampleProps) {
  const code = [
    python && {
      content: python.content,
      codeLanguage: "python",
      codeFileUrl: python.path
    },
    typescript && {
      content: typescript.content,
      codeLanguage: "typescript",
      codeFileUrl: typescript.path
    }
  ].filter((v) => !!v);

  return (
    <MiniQL
      code={code.length == 0 ? undefined : code}
      {...props}
    />
  );
}
