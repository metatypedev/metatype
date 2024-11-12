// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import MiniQL, { MiniQLProps } from "@site/src/components/MiniQL";
import React from "react";

interface TGExampleProps extends MiniQLProps {
  python?: { content: string; path: string };
  typescript?: { content: string; path: string };
  rust?: { content: string; path: string };
  codeLang?: "py" | "ts" | "rust";
  code?: string;
  codePath?: string;
}

export default function TGExample({
  python,
  typescript,
  rust,
  ...props
}: TGExampleProps) {
  const code = [
    python && {
      content: python.content,
      codeLanguage: "python",
      codeFileUrl: python.path,
    },
    typescript && {
      content: typescript.content,
      codeLanguage: "typescript",
      codeFileUrl: typescript.path,
    },
    rust && {
      content: rust.content,
      codeLanguage: "rust",
      codeFileUrl: rust.path,
    },
  ].filter((v) => !!v);

  return <MiniQL code={code.length == 0 ? undefined : code} {...props} />;
}
