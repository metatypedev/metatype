// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeGraph } from "../../typegraph/mod.ts";

export class RestSchemaGenerator {
  schema: Map<number, unknown> = new Map();
  refs: Map<string, unknown> = new Map();

  constructor(private tg: TypeGraph) {}

  asRef(idx: number) {
    const name = this.tg.type(idx).title;
    return { $ref: `#/components/schemas/${name}` };
  }

  generateAll() {
    for (let idx = 0; idx < this.tg.tg.types.length; idx += 1) {
      this.generate(idx);
    }
    return {
      schema: this.schema,
      refs: this.refs,
    };
  }

  generate(root: number) {
    const inProgress = new Set<number>();
    return this.#generateHelper(root, inProgress);
  }

  #generateHelper(
    typeIdx: number,
    inProgress: Set<number>,
  ): unknown {
    if (this.schema.has(typeIdx)) {
      return this.schema.get(typeIdx);
    }

    const typeNode = this.tg.type(typeIdx);

    let outputSchema = null;
    if (typeNode.enum != null) {
      outputSchema = { enum: typeNode.enum! };
    } else if (inProgress.has(typeIdx)) {
      outputSchema = this.asRef(typeIdx);
    } else {
      inProgress.add(typeIdx);

      switch (typeNode.type) {
        case "boolean": {
          outputSchema = { type: "boolean" };
          break;
        }
        case "float": {
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
          const itemIdx = typeNode.item;
          const schema: any = this.#generateHelper(itemIdx, inProgress);
          if (schema.item == "object") {
            outputSchema = { ...schema, type: ["null", schema.type] };
          } else if ("anyOf" in schema || "oneOf" in schema) {
            const variantKey = "anyOf" in schema ? "anyOf" : "oneOf";
            const variantItems = schema[variantKey];
            const types = (variantItems as Array<any>)
              .map((s) => s.type)
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
          const itemsIdx = typeNode.items;
          const schema = this.#generateHelper(itemsIdx, inProgress);
          outputSchema = { type: "array", items: schema };
          break;
        }
        case "object": {
          const properties = {} as any;
          for (const [key, idx] of Object.entries(typeNode.properties)) {
            properties[key] = this.#generateHelper(idx, inProgress);
          }
          outputSchema = { type: "object", properties };
          break;
        }
        case "function": {
          outputSchema = this.#generateHelper(typeNode.output, inProgress);
          break;
        }
        case "union": {
          outputSchema = {
            anyOf: typeNode.anyOf.map((idx) =>
              this.#generateHelper(idx, inProgress)
            ),
          };
          break;
        }
        case "either": {
          outputSchema = {
            oneOf: typeNode.oneOf.map((idx) =>
              this.#generateHelper(idx, inProgress)
            ),
          };
          break;
        }
        default:
          throw new Error(`Unsupported type: ${typeNode.type}`);
      }

      inProgress.delete(typeIdx);
    }

    if (!("$ref" in outputSchema)) {
      outputSchema = { title: typeNode.title, ...outputSchema };
      this.refs.set(outputSchema.title, outputSchema);
    }

    this.schema.set(typeIdx, outputSchema);
    return outputSchema;
  }
}
