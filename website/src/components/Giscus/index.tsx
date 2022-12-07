// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import React from "react";
import { default as Component } from "@giscus/react";
import { useColorMode } from "@docusaurus/theme-common";

export default function Giscus() {
  const { colorMode } = useColorMode();
  return (
    <Component
      repo="metatypedev/metatype"
      repoId="R_kgDOHczuCQ"
      category="Comments"
      categoryId="DIC_kwDOHczuCc4CSyX-"
      mapping="pathname"
      strict="0"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme={colorMode}
      lang="en"
      loading="lazy"
    />
  );
}
