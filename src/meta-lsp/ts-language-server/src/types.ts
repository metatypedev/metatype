// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Parser } from "../parser.ts";

export type TypegraphDefinition = {
  name: string;
  builder: Parser.SyntaxNode;
};
