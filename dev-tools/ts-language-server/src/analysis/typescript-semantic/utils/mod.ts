import { Parser } from "../../../parser.ts";

export type MethodCall = {
  object: Parser.SyntaxNode;
  method: string;
  arguments: Parser.SyntaxNode;
};

export function asMethodCall(node: Parser.SyntaxNode): MethodCall | null {
  if (node.type !== "call_expression") {
    return null;
  }
  const fn = node.childForFieldName("function")!;
  if (fn.type !== "member_expression") {
    return null;
  }
  const object = fn.childForFieldName("object")!;
  const property = fn.childForFieldName("property")!;
  if (property.type !== "property_identifier") {
    return null;
  }
  const argumentsNode = node.childForFieldName("arguments")!;
  if (argumentsNode.type !== "arguments") {
    return null;
  }
  return {
    object: object,
    method: property.text,
    arguments: argumentsNode,
  };
}
