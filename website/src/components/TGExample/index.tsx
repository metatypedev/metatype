// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import MiniQL, { MiniQLProps } from "@site/src/components/MiniQL";
import React from "react";

interface TGExampleProps extends MiniQLProps {
  python: string;
}

function splitAt(s: string, index: number) {
  return [s.slice(0, index), s.slice(index + 1)];
}

export default function TGExample({ python, ...props }: TGExampleProps) {
  const [pyFile, pyCode] = splitAt(python, python.indexOf("\n"));
  return (
    <MiniQL
      code={pyCode}
      codeLanguage="python"
      codeFileUrl={pyFile}
      {...props}
    />
  );
}
