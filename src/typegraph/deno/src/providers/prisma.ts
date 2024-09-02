// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Runtime } from "../runtimes/mod.ts";
import { runtimes } from "../wit.ts";
import { Typedef } from "../types.ts";
import { t } from "../index.ts";
import { Effect } from "../gen/typegraph_core.d.ts";
import { genRef } from "./../typegraph.ts";

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

  /** create a function for a prisma `findUnique` query */
  findUnique(model: string | Typedef): t.Func {
    if (typeof model == "string") {
      model = genRef(model);
    }
    const type = runtimes.prismaFindUnique(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  /** create a function for a prisma `findMany` query */
  findMany(model: string | Typedef): t.Func {
    if (typeof model == "string") {
      model = genRef(model);
    }
    const type = runtimes.prismaFindMany(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  /** create a function for a prisma `findFirst` query */
  findFirst(model: string | Typedef): t.Func {
    if (typeof model == "string") {
      model = genRef(model);
    }
    const type = runtimes.prismaFindFirst(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  /** create a function for a prisma `aggregate` query */
  aggregate(model: string | Typedef): t.Func {
    if (typeof model == "string") {
      model = genRef(model);
    }
    const type = runtimes.prismaAggregate(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  /** create a function for a prisma `count` query */
  count(model: string | Typedef): t.Func {
    if (typeof model == "string") {
      model = genRef(model);
    }
    const type = runtimes.prismaCount(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  /** create a function for a prisma `groupBy` query */
  groupBy(model: string | Typedef): t.Func {
    if (typeof model == "string") {
      model = genRef(model);
    }
    const type = runtimes.prismaGroupBy(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  /** create a function for a prisma `create` query */
  create(model: string | Typedef): t.Func {
    if (typeof model == "string") {
      model = genRef(model);
    }
    const type = runtimes.prismaCreateOne(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  /** create a function for a prisma `createMany` query */
  createMany(model: string | Typedef): t.Func {
    if (typeof model == "string") {
      model = genRef(model);
    }
    const type = runtimes.prismaCreateMany(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  /** create a function for a prisma `update` query */
  update(model: string | Typedef): t.Func {
    if (typeof model == "string") {
      model = genRef(model);
    }
    const type = runtimes.prismaUpdateOne(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  /** create a function for a prisma `updateMany` query */
  updateMany(model: string | Typedef): t.Func {
    if (typeof model == "string") {
      model = genRef(model);
    }
    const type = runtimes.prismaUpdateMany(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  /** create a function for a prisma `upsert` query */
  upsert(model: string | Typedef): t.Func {
    if (typeof model == "string") {
      model = genRef(model);
    }
    const type = runtimes.prismaUpsertOne(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  /** create a function for a prisma `delete` query */
  delete(model: string | Typedef): t.Func {
    if (typeof model == "string") {
      model = genRef(model);
    }
    const type = runtimes.prismaDeleteOne(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  /** create a function for a prisma `deleteMany` query */
  deleteMany(model: string | Typedef): t.Func {
    if (typeof model == "string") {
      model = genRef(model);
    }
    const type = runtimes.prismaDeleteMany(this._id, model._id);
    return t.Func.fromTypeFunc(type);
  }

  /** create a function for prisma `execute` */
  execute(query: string, parameters: Typedef, effect: Effect): t.Func {
    const type = runtimes.prismaExecute(
      this._id,
      query,
      parameters._id,
      effect,
    );
    return t.Func.fromTypeFunc(type);
  }

  /** create a function for prisma `queryRaw` */
  queryRaw(query: string, parameters: Typedef | null, output: Typedef): t.Func {
    const type = runtimes.prismaQueryRaw(
      this._id,
      query,
      parameters ? parameters._id : undefined,
      output._id,
    );
    return t.Func.fromTypeFunc(type);
  }

  /** define a relationship */
  link(
    targetType: string | Typedef,
    name: string,
    arg?: PrismaLinkArg,
  ): Typedef {
    return prismaLink(targetType, name, arg ?? {});
  }
}

function prismaLink(
  targetType: string | Typedef,
  name?: string,
  arg?: PrismaLinkArg,
): Typedef {
  if (typeof targetType == "string") {
    targetType = genRef(targetType);
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
