// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeNode } from "../type_node.ts";
import { TypeGraph } from "../typegraph.ts";

export class RestSchemaGenerator {
  cache: Map<number, string> = new Map();
  constructor(private tg: TypeGraph) {}
  generateFromNode(typeNode: TypeNode) {
    let outputSchema = null;
    if (typeNode.enum != null) {
      outputSchema = { enum: typeNode.enum! };
    } else {
      switch (typeNode.type) {
        case "boolean": {
          outputSchema = { type: "boolean" };
          break;
        }
        case "number": {
          outputSchema = { type: "number" };
          break;
        }
        case "integer": {
          outputSchema = { type: "integer" };
          break;
        }
        case "string": {
          outputSchema = { type: "string" };
          break;
        }
        case "file": {
          outputSchema = { type: "string" };
          break;
        }
        case "optional": {
          const schema = this.generate(typeNode.item) as any;
          if (schema.item == "object") {
            outputSchema = { ...schema, type: ["null", schema.type] };
          } else if (schema.item == "optional") {
            outputSchema = this.generate(typeNode.item);
          } else if ("anyOf" in schema || "oneOf" in schema) {
            const variantKey = "anyOf" in schema ? "anyOf" : "oneOf";
            const variantItems = schema[variantKey];
            const types = (variantItems as Array<any>)
              .map((s: any) => s.type)
              .flat();
            outputSchema = {
              type: ["null", ...types],
              [variantKey]: variantItems,
            };
          } else {
            outputSchema = { type: ["null", schema.type] };
          }
          break;
        }
        case "array": {
          const schema = this.generate(typeNode.items);
          outputSchema = { type: "array", items: schema };
          break;
        }
        case "object": {
          const properties = {} as any;
          for (const [key, idx] of Object.entries(typeNode.properties)) {
            properties[key] = this.generate(idx);
          }
          outputSchema = { type: "object", properties };
          break;
        }
        case "function": {
          outputSchema = this.generate(typeNode.output);
          break;
        }
        case "union": {
          outputSchema = {
            anyOf: typeNode.anyOf.map((tpe) => this.generate(tpe)),
          };
          break;
        }
        case "either": {
          outputSchema = {
            oneOf: typeNode.oneOf.map((tpe) => this.generate(tpe)),
          };
          break;
        }
        default:
          throw new Error(`Unsupported type: ${typeNode.type}`);
      }
    }

    return { title: typeNode.title, ...outputSchema };
  }
  generate(
    typeIdx: number,
  ): unknown {
    if (this.cache.has(typeIdx)) {
      return this.cache.get(typeIdx);
    }
    const typeNode = this.tg.type(typeIdx);
    const outputSchema = this.generateFromNode(typeNode);
    this.cache.set(typeIdx, outputSchema);
    return outputSchema;
  }
}
