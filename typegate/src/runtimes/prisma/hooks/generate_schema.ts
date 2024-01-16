// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Type, TypeNode } from "../../../typegraph/type_node.ts";
import { PushHandler } from "../../../typegate/hooks.ts";
import { SecretManager, TypeGraphDS } from "../../../typegraph/mod.ts";
import {
  Cardinality,
  Model,
  Property,
  Relationship,
  StringNode,
} from "../../../typegraph/types.ts";
import { ensureNonNullable } from "../../../utils.ts";
import { PrismaRT } from "../mod.ts";
import { validate_prisma_runtime_data } from "native";

type QuantifierSuffix = "" | "?" | "[]";

export const generateSchema: PushHandler = async (
  typegraph,
  secretManager,
  _pushResponse,
) => {
  typegraph.runtimes = typegraph.runtimes.map((rt) => {
    if (rt.name !== "prisma") {
      return rt;
    }
    const runtime = rt as PrismaRT.DS<PrismaRT.DataRaw>;
    const err = validate_prisma_runtime_data({ obj: runtime.data }).error;
    if (err != null) {
      throw new Error(`Invalid Prisma runtime data: ${err}`);
    }
    const data = runtime.data as PrismaRT.DataWithDatamodel;
    const schemaGenerator = new SchemaGenerator(typegraph, data, secretManager);
    data.datamodel = schemaGenerator.generate();
    return runtime;
  });

  return await typegraph;
};

class ModelField {
  fkeys: ModelField[] = [];
  fkeysUnique = false;

  constructor(
    public name: string,
    public type: string,
    public tags: string[] = [],
  ) {}

  stringify(): string {
    const tags = this.tags.length > 0 ? ` ${this.tags.join(" ")}` : "";
    return `${this.name} ${this.type}${tags}`;
  }
}

class FieldBuilder {
  static #quantifier(cardinality: Cardinality) {
    switch (cardinality) {
      case "optional":
        return "?";
      case "one":
        return "";
      case "many":
        return "[]";
    }
  }

  constructor(
    private typegraph: TypeGraphDS,
    private relationships: Relationship[],
    private models: Model[],
    private provider: Provider,
    private source = "db", // datasource name in the .prisma file
  ) {}

  build(prop: Property): ModelField {
    switch (prop.type) {
      case "scalar": {
        const quant = FieldBuilder.#quantifier(prop.cardinality);
        let typeName: string = prop.propType.type;
        let tags: string[] = [];
        if (prop.propType.type === "String") {
          const [typeIdx, _] = this.#unwrapQuantifier(prop.typeIdx);
          const typeNode = this.typegraph.types[typeIdx];

          if (typeNode.type !== Type.STRING) {
            throw new Error("expected string type");
          }
          [typeName, tags] = this.#getStringTypeAndTags(typeNode);
        }

        if (prop.unique) {
          tags.push("@unique");
        }

        if (prop.auto) {
          switch (prop.propType.type) {
            case "String":
              switch (prop.propType.format) {
                case "DateTime":
                  tags.push("@default(now())");
                  break;
                case "Uuid":
                  tags.push("@default(uuid())");
                  break;
                default:
                  throw new Error(
                    "unsupported auto attribute on type string",
                  );
              }
              break;
            case "Int":
              tags.push("@default(autoincrement())");
              break;
            default:
              throw new Error(
                `unsupported auto attribute on type ${prop.propType.type}}`,
              );
          }
        }

        if (prop.defaultValue != null) {
          tags.push(`@default(${JSON.stringify(prop.defaultValue)})`);
        }

        const field = new ModelField(prop.key, typeName + quant, tags);
        return field;
      }

      case "relationship": {
        const quant = FieldBuilder.#quantifier(prop.cardinality);
        const rel = this.relationships.find((r) =>
          r.name === prop.relationshipName
        );
        const tags: string[] = [];
        if (rel == null) {
          throw new Error(`relationship not found: ${prop.relationshipName}`);
        }
        switch (prop.relationshipSide) {
          case "right": {
            tags.push(
              `@relation(name: ${toPrismaString(prop.relationshipName)})`,
            );
            const field = new ModelField(
              prop.key,
              prop.modelName + quant,
              tags,
            );
            return field;
          }

          case "left": {
            const toPascalCase = (s: string) => s[0].toUpperCase() + s.slice(1);
            const leftModel = this.models.find((m) =>
              m.typeIdx === rel.left.type_idx
            );
            if (leftModel == null) {
              throw new Error("left model not found");
            }
            const fields = leftModel.idFields.map((key) =>
              `${prop.key}${toPascalCase(key)}`
            );
            const fkeys = leftModel.idFields.map((key) => {
              const idProp = leftModel.props.find((p) => p.key === key)!;
              const modelField = this.build(
                { ...idProp, cardinality: prop.cardinality },
              );
              modelField.name = `${prop.key}${toPascalCase(modelField.name)}`;
              modelField.tags = modelField.tags.filter(
                (t) => !t.startsWith("@default"),
              );
              return modelField;
            });

            const name = toPrismaString(prop.relationshipName);
            const formattedFields = toPrismaList(fields);
            const references = toPrismaList(leftModel.idFields);

            tags.push(
              `@relation(name: ${name}, fields: ${formattedFields}, references: ${references})`,
            );
            const field = new ModelField(
              prop.key,
              prop.modelName + quant,
              tags,
            );
            field.fkeys = fkeys;
            field.fkeysUnique = rel.right.cardinality !== "many";
            return field;
          }

          default:
            throw new Error("");
        }
      }

      default:
        throw new Error("");
    }
  }

  fieldFromScalarType(
    name: string,
    typeNode: TypeNode,
    quantifier: QuantifierSuffix,
  ): ModelField | null {
    const scalar = this.#getScalarTypeNameAndTags(typeNode);
    if (scalar == null) {
      return null;
    }
    const [type, tags] = scalar;
    return new ModelField(name, type + quantifier, tags);
  }

  #getScalarTypeNameAndTags(
    typeNode: TypeNode,
  ): [string, string[]] | null {
    switch (typeNode.type) {
      case Type.STRING:
        return this.#getStringTypeAndTags(typeNode);

      case Type.BOOLEAN:
        return ["Boolean", []];

      case Type.INTEGER:
        return ["Int", []];

      case Type.FLOAT:
        return ["Float", []];

      case Type.OBJECT:
        return null;

      default:
        throw new Error(`unsupported type: ${typeNode.type}`);
    }
  }

  #getStringTypeAndTags(typeNode: StringNode): [string, string[]] {
    const tags: string[] = [];
    const src = this.source;
    switch (this.provider) {
      case "postgresql":
      // deno-lint-ignore no-fallthrough
      case "mysql":
        switch (typeNode.format) {
          case "uuid":
            tags.push(`@${src}.Uuid`);
            return ["String", [`@${src}.Uuid`]];

          case "date":
          case "date-time": {
            const injection = typeNode.injection;
            const tags = [];
            if (injection) {
              if (injection.source === "dynamic") {
                if ("value" in injection.data) {
                  throw new Error("");
                }
                const onCreate = injection.data.create;
                if (onCreate === "now") {
                  tags.push("@default(now())");
                }
                const onUpdate = injection.data.update;
                if (onUpdate === "now") {
                  tags.push("@updatedAt");
                }
              }
            }
            return ["DateTime", tags];
          }

          // TODO json -- needs a dedicated ticket

          default:
            if (typeNode.maxLength != null) {
              if (typeNode.minLength === typeNode.maxLength) {
                return ["String", [`@${src}.Char(${typeNode.minLength})`]];
              } else {
                return ["String", [`@${src}.VarChar(${typeNode.maxLength})`]];
              }
            } else {
              return ["String", [`@${src}.Text`]];
            }
        }

      case "mongodb":
        // TODO mongodb ObjectId
        return ["String", []];

      default:
        throw new Error(`unsupported provider: ${this.provider}`);
    }
  }

  #unwrapQuantifier(typeIdx: number): [number, QuantifierSuffix] {
    const typeNode = this.typegraph.types[typeIdx];
    switch (typeNode.type) {
      case Type.OPTIONAL:
        return [typeNode.item, "?"];
      case Type.LIST:
        return [typeNode.items, "[]"];
      default:
        return [typeIdx, ""];
    }
  }
}

const SUPPORTED_PROVIDERS = ["postgresql", "mysql", "mongodb"] as const;
type Provider = typeof SUPPORTED_PROVIDERS[number];

export class SchemaGenerator {
  #provider: Provider;
  #fieldBuilder: FieldBuilder;
  #models: Model[];

  constructor(
    private readonly typegraph: TypeGraphDS,
    runtimeData: PrismaRT.DataRaw,
    secretManager: SecretManager,
  ) {
    const connectionString = secretManager.secretOrFail(
      runtimeData.connection_string_secret,
    );
    // TODO other way to get provider? cockroachdb, sqlserver, sqlite(???)
    const provider = new URL(connectionString).protocol.slice(0, -1);
    if (!SUPPORTED_PROVIDERS.includes(provider as Provider)) {
      throw new Error(`unsupported provider: ${provider}`);
    }
    this.#provider = provider as Provider;
    this.#fieldBuilder = new FieldBuilder(
      typegraph,
      runtimeData.relationships,
      runtimeData.models,
      this.#provider,
    );
    this.#models = runtimeData.models;
  }

  #type(idx: number): TypeNode {
    const typeNode = this.typegraph.types[idx];
    ensureNonNullable(typeNode, `type not found, idx=${idx}`);
    return typeNode;
  }

  generateModel(model: Model): string {
    const tags: string[] = [];
    const modelFields: ModelField[] = [];

    const fkeysMap = new Map<string, string[]>();

    for (const prop of model.props) {
      const field = this.#fieldBuilder.build(prop);
      modelFields.push(field);
      modelFields.push(...field.fkeys);
      if (field.fkeys.length > 0) {
        fkeysMap.set(field.name, field.fkeys.map((fkey) => fkey.name));
      }
      if (field.fkeysUnique && !model.idFields.includes(field.name)) {
        const fieldNames = field.fkeys.map((fkey) => fkey.name);
        tags.push(`@@unique(${fieldNames.join(", ")})`);
      }
    }

    // set @id tag
    const ids = model.idFields.flatMap((key) => fkeysMap.get(key) ?? [key]);

    if (ids.length === 0) {
      // unreachable
      throw new Error("no @id field found");
    } else if (ids.length === 1) {
      const id = ids[0];
      modelFields.find((field) => field.name === id)!.tags.push("@id");
    } else {
      const names = ids.join(", ");
      tags.push(`@@id([${names}])`);
    }

    const formattedFields = modelFields.map((field) =>
      `    ${field.stringify()}\n`
    )
      .join("");
    const formattedTags = tags.length > 0
      ? "\n" + tags.map((tag) => `    ${tag}\n`).join("")
      : "";

    return `model ${model.typeName} {\n${formattedFields}${formattedTags}}`;
  }

  generate() {
    return this.#models.map((model) => this.generateModel(model)).join(
      "\n\n",
    );
  }
}

function toPrismaString(s: string) {
  return JSON.stringify(s);
}

function toPrismaList(list: string[]): string {
  return `[${list.join(", ")}]`;
}
