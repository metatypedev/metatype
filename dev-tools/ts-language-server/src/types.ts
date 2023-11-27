import { Parser } from "../parser.ts";

export type TypegraphDefinition = {
  name: string;
  builder: Parser.SyntaxNode;
};
