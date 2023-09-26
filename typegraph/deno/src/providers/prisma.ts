// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Runtime } from "../runtimes/mod.ts";
import { runtimes } from "../wit.ts";
import { Typedef } from "../types.ts";
import { t } from "../mod.ts";
import { Effect } from "../../gen/exports/metatype-typegraph-runtimes.d.ts";

type PrismaLinkArg = {
  fkey?: boolean;
  field?: string;
  unique?: boolean;
};
export class PrismaRuntime extends Runtime {
  name: string;
  connectionStringSecret: string;

  constructor(name: string, connectionStringSecret: string) {
    const id = runtimes.registerPrismaRuntime({
      name,
      connectionStringSecret,
    });
    super(id);
    this.name = name;
    this.connectionStringSecret = connectionStringSecret;
  }

  findUnique(model: string | Typedef) {
    if (typeof model == "string") {
      model = t.ref(model);
    }
    const type = runtimes.prismaFindUnique(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  findMany(model: string | Typedef) {
    if (typeof model == "string") {
      model = t.ref(model);
    }
    const type = runtimes.prismaFindMany(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  findFirst(model: string | Typedef) {
    if (typeof model == "string") {
      model = t.ref(model);
    }
    const type = runtimes.prismaFindFirst(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  aggregate(model: string | Typedef) {
    if (typeof model == "string") {
      model = t.ref(model);
    }
    const type = runtimes.prismaAggregate(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  count(model: string | Typedef) {
    if (typeof model == "string") {
      model = t.ref(model);
    }
    const type = runtimes.prismaCount(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  groupBy(model: string | Typedef) {
    if (typeof model == "string") {
      model = t.ref(model);
    }
    const type = runtimes.prismaGroupBy(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  create(model: string | Typedef) {
    if (typeof model == "string") {
      model = t.ref(model);
    }
    const type = runtimes.prismaCreateOne(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  createMany(model: string | Typedef) {
    if (typeof model == "string") {
      model = t.ref(model);
    }
    const type = runtimes.prismaCreateMany(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  update(model: string | Typedef) {
    if (typeof model == "string") {
      model = t.ref(model);
    }
    const type = runtimes.prismaUpdateOne(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  updateMany(model: string | Typedef) {
    if (typeof model == "string") {
      model = t.ref(model);
    }
    const type = runtimes.prismaUpdateMany(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  upsert(model: string | Typedef) {
    if (typeof model == "string") {
      model = t.ref(model);
    }
    const type = runtimes.prismaUpsertOne(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  delete(model: string | Typedef) {
    if (typeof model == "string") {
      model = t.ref(model);
    }
    const type = runtimes.prismaDeleteOne(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  deleteMany(model: string | Typedef) {
    if (typeof model == "string") {
      model = t.ref(model);
    }
    const type = runtimes.prismaDeleteMany(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  execute(query: string, parameters: Typedef, effect: Effect) {
    const type = runtimes.prismaExecute(
      this._id,
      query,
      parameters._id,
      effect,
    );
    return t.Func.fromTypeFunc(type);
  }

  queryRaw(query: string, parameters: Typedef | null, output: Typedef) {
    const type = runtimes.prismaQueryRaw(
      this._id,
      query,
      parameters ? parameters._id : null,
      output._id,
    );
    return t.Func.fromTypeFunc(type);
  }

  link(
    targetType: string | Typedef,
    name: string,
    arg?: PrismaLinkArg,
  ) {
    return prismaLink(targetType, name, arg ?? {});
  }
}

function prismaLink(
  targetType: string | Typedef,
  name?: string,
  arg?: PrismaLinkArg,
) {
  if (typeof targetType == "string") {
    targetType = t.ref(targetType);
  }
  arg = arg ?? {};
  const typeId = runtimes.prismaLink({
    targetType: targetType._id,
    relationshipName: name,
    foreignKey: arg.fkey,
    targetField: arg.field,
    unique: arg.unique,
  });
  return new Typedef(typeId, {});
}
