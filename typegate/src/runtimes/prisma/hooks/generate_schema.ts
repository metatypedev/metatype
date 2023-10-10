// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { ObjectNode, Type, TypeNode } from "../../../typegraph/type_node.ts";
import { PushHandler } from "../../../typegate/hooks.ts";
import { SecretManager, TypeGraphDS } from "../../../typegraph/mod.ts";
import { Relationship, StringNode } from "../../../typegraph/types.ts";
import { ensure, ensureNonNullable } from "../../../utils.ts";
import { PrismaRT } from "../mod.ts";
import { validate_prisma_runtime_data } from "native";
import { isUuid } from "../../../typegraph/type_node.ts";

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
  constructor(
    private typegraph: TypeGraphDS,
    private relationships: Relationship[],
    private provider: Provider,
    private source = "db", // datasource name in the .prisma file
  ) {}

  build(field: string, parentTypeIdx: number): ModelField {
    const parentType = this.#type(parentTypeIdx);
    if (parentType.type !== Type.OBJECT) {
      throw new Error("parent type must be object");
    }

    const [typeIdx, quant] = this.#unwrapQuantifier(
      parentType.properties[field],
    );
    const typeNode = this.#type(typeIdx);

    ensure(
      typeNode.type !== Type.OPTIONAL && typeNode.type !== Type.ARRAY,
      "nested quantifier not supported",
    );

    const fromScalarType = this.fieldFromScalarType(field, typeNode, quant);
    const modelField: ModelField = fromScalarType ?? this.fieldFromObjectType(
      field,
      typeIdx,
      typeNode as ObjectNode,
      parentTypeIdx,
      parentType,
      quant,
    );

    modelField.tags.push(...this.#getAdditionalTags(typeNode));

    return modelField;
  }

  #getAdditionalTags(typeNode: TypeNode): string[] {
    const tags: string[] = [];

    if (typeNode.as_id) {
      tags.push("@id");
    }

    if (typeNode.config?.unique) {
      tags.push("@unique");
    }

    if (typeNode.config?.auto) {
      // TODO check database support
      if (typeNode.type === Type.INTEGER) {
        tags.push("@default(autoincrement())");
      } else if (isUuid(typeNode)) {
        tags.push("@default(uuid())");
      } else {
        throw new Error("auto not supported for this type");
      }
    }

    return tags;
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
      case "mysql":
        switch (typeNode.format) {
          case "uuid":
            tags.push(`@${src}.Uuid`);
            return ["String", [`@${src}.Uuid`]];

          // TODO date-time

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

  fieldFromObjectType(
    name: string,
    typeIdx: number,
    typeNode: ObjectNode,
    parentIdx: number,
    _parentNode: ObjectNode,
    quant: QuantifierSuffix,
  ): ModelField {
    // TODO might be more than one, or less
    const found = this.#findRelationship(typeIdx, parentIdx, name);
    if (found == null) {
      throw new Error(`relationship not found: ${name}`);
    }
    const [rel, side] = found;
    switch (side) {
      case "left":
        return new ModelField(name, typeNode.title + quant, [
          `@relation(name: ${toPrismaString(rel.name)})`,
        ]);

      case "right": {
        const [tag, fkeys] = this.#getRelationTagAndFkeys(
          name,
          typeNode,
          rel,
          quant === "?",
        );
        const modelField = new ModelField(name, typeNode.title + quant, [tag]);
        // additional tags??
        modelField.fkeys = fkeys;
        modelField.fkeysUnique = rel.right.cardinality !== "many";
        return modelField;
      }

      default:
        throw new Error(`invalid side: ${side}`);
    }
  }

  #getRelationTagAndFkeys(
    field: string,
    type: TypeNode,
    relationship: Relationship,
    optional: boolean,
  ): [string, ModelField[]] {
    const toPascalCase = (s: string) => s[0].toUpperCase() + s.slice(1);

    if (type.type !== Type.OBJECT) {
      throw new Error("type must be object");
    }
    const ids = Object.entries(type.properties).flatMap(([name, idx]) => {
      const t = this.#type(idx);
      return t.as_id ? [name] : [];
    });
    const fields = ids.map((id) => `${field}${toPascalCase(id)}`);

    const typeNameSuffix = optional ? "?" : "";

    const fkeys = fields.map((field, i) => {
      const [typeIdx, _quant] = this.#unwrapQuantifier(
        type.properties[ids[i]],
      );
      const typeNode = this.#type(typeIdx);
      const r = this.#getScalarTypeNameAndTags(typeNode);
      ensureNonNullable(r, "invalid scalar type");
      const [typeName, tags] = r;
      const modelField = new ModelField(field, typeName + typeNameSuffix, tags);
      modelField.tags = modelField.tags.filter((tag) =>
        tag !== "@id" && !tag.startsWith("@default")
      );
      return modelField;
    });

    const name = toPrismaString(relationship.name);
    const formattedFields = toPrismaList(fields);
    const references = toPrismaList(ids);

    return [
      `@relation(name: ${name}, fields: ${formattedFields}, references: ${references})`,
      fkeys,
    ];
  }

  #findRelationship(
    idx: number,
    parentIdx: number,
    parentField: string,
  ): [rel: Relationship, parentSide: "left" | "right"] | null {
    type T = [Relationship, "left" | "right"];

    const relationships = this
      .relationships.flatMap((rel) => {
        if (
          rel.left.type_idx === idx && rel.right.type_idx === parentIdx &&
          rel.right.field === parentField
        ) {
          return [[rel, "right"]] as T[];
        }
        if (
          rel.right.type_idx === idx && rel.left.type_idx === parentIdx &&
          rel.left.field === parentField
        ) {
          return [[rel, "left"]] as T[];
        }
        return [] as T[];
      });

    if (relationships.length === 0) {
      const typeName = this.#type(idx).title;
      const parentName = this.#type(parentIdx).title;
      const types = `${typeName} and ${parentName}`;
      throw new Error(`relationship not found between types ${types}`);
    }

    if (relationships.length > 1) {
      const typeName = this.#type(idx).title;
      const parentName = this.#type(parentIdx).title;
      const types = `${typeName} and ${parentName}`;
      throw new Error(`multiple relationships found between types ${types}`);
    }

    return relationships[0];
  }

  #unwrapQuantifier(typeIdx: number): [number, QuantifierSuffix] {
    const typeNode = this.#type(typeIdx);
    switch (typeNode.type) {
      case Type.OPTIONAL:
        return [typeNode.item, "?"];
      case Type.ARRAY:
        return [typeNode.items, "[]"];
      default:
        return [typeIdx, ""];
    }
  }

  #type(idx: number): TypeNode {
    const typeNode = this.typegraph.types[idx];
    ensureNonNullable(typeNode, `type not found, idx=${idx}`);
    return typeNode;
  }
}

const SUPPORTED_PROVIDERS = ["postgresql", "mysql", "mongodb"] as const;
type Provider = typeof SUPPORTED_PROVIDERS[number];

export class SchemaGenerator {
  #provider: Provider;
  #fieldBuilder: FieldBuilder;
  #models: number[];

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
      this.#provider,
    );
    this.#models = runtimeData.models;
  }

  #type(idx: number): TypeNode {
    const typeNode = this.typegraph.types[idx];
    ensureNonNullable(typeNode, `type not found, idx=${idx}`);
    return typeNode;
  }

  generateModel(typeIdx: number): string {
    const typeNode = this.#type(typeIdx);
    if (typeNode.type !== Type.OBJECT) {
      throw new Error("type must be object");
    }

    const tags: string[] = [];
    const modelFields: ModelField[] = [];
    for (const [name, idx] of Object.entries(typeNode.properties)) {
      // TODO check runtime

      const fieldNode = this.#type(idx);
      switch (fieldNode.type) {
        case Type.FUNCTION:
          continue;
        default:
      }

      const field = this.#fieldBuilder.build(name, typeIdx);
      modelFields.push(field);

      modelFields.push(...field.fkeys);
      if (field.fkeysUnique) {
        const fieldNames = field.fkeys.map((fkey) => fkey.name);
        tags.push(`@@unique(${fieldNames.join(", ")})`);
      }
    }

    const idFields = modelFields.filter((field) => field.tags.includes("@id"));
    ensure(idFields.length > 0, "no @id field found");

    if (idFields.length > 1) {
      const names = idFields.map((field) => field.name).join(", ");
      tags.push(`@@id([${names}])`);
      for (const field of idFields) {
        field.tags = field.tags.filter((tag) => tag !== "@id");
      }
    }

    const formattedFields = modelFields.map((field) =>
      `    ${field.stringify()}\n`
    )
      .join("");
    const formattedTags = tags.length > 0
      ? "\n" + tags.map((tag) => `    ${tag}\n`).join("")
      : "";

    return `model ${typeNode.title} {\n${formattedFields}${formattedTags}}`;
  }

  generate() {
    return this.#models.map((modelIdx) => this.generateModel(modelIdx)).join(
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
