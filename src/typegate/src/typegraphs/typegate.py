# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, fx, t, typegraph
from typegraph.gen.exports.runtimes import TypegateOperation
from typegraph.gen.types import Err
from typegraph.graph.params import Auth, Cors, Rate
from typegraph.runtimes.base import Materializer
from typegraph.runtimes.deno import DenoRuntime
from typegraph.wit import runtimes, store

### Prisma query (Json protocol):
# https://github.com/prisma/prisma-engines/blob/93f79ec1ca7867558f10130d8db84fb7bf150357/query-engine/request-handlers/src/protocols/json/body.rs#L13C10-L13C18

# https://github.com/prisma/prisma-engines/blob/93f79ec1ca7867558f10130d8db84fb7bf150357/query-engine/schema/src/query_schema.rs#L227
prisma_query_tags = [
    "findUnique",
    # "findUniqueOrThrow",
    "findFirst",
    # "findFirstOrThrow",
    "findMany",
    "createOne",
    "createMany",
    "updateOne",
    "updateMany",
    "deleteOne",
    "deleteMany",
    "upsertOne",
    "upsertMany",
    "aggregate",
    "groupBy",
    #
    # raw operations
    "executeRaw",
    "queryRaw",
    "runCommandRaw",
    "findRaw",
    "aggregateRaw",
]

# https://github.com/prisma/prisma-engines/blob/93f79ec1ca7867558f10130d8db84fb7bf150357/query-engine/request-handlers/src/protocols/json/body.rs#L50
prisma_query_single = t.struct(
    {
        "modelName": t.string().optional(),
        "action": t.enum(prisma_query_tags, name="PrismaQueryTag"),
        # "query": t.struct(
        #     {
        #         "arguments": t.json().optional(),  # TODO t.record([t.string(), t.json()])
        #         "selection": t.json(),  # TODO t.record([t.string(), t.enum([t.boolean(), g.ref("PrismaFieldQuery")])])
        #     },
        #     name="PrismaFieldQuery",
        # ),
        "query": t.json(),
    },
    name="PrismaSingleQuery",
)

prisma_query_batch = t.struct(
    {
        "batch": t.list(prisma_query_single),
        "transaction": t.struct(
            {
                "isolationLevel": t.enum(
                    [
                        "read uncommitted",
                        "readuncommitted",
                        "read committed",
                        "readcommitted",
                        "repeatable read",
                        "repeatableread",
                        "snapshot",
                        "serializable",
                    ]
                ).optional(),
            }
        ).optional(),
    },
    name="PrismaBatchQuery",
)

prisma_query = t.either([prisma_query_single, prisma_query_batch], name="PrismaQuery")


@typegraph(
    cors=Cors(
        allow_origin=["*"],
        allow_credentials=True,
    ),
    rate=Rate(
        window_sec=60,
        window_limit=128,
        query_limit=8,
        local_excess=5,
        context_identifier="user",
    ),
)
def typegate(g: Graph):
    deno = DenoRuntime()
    admin_only = deno.policy(
        "admin_only",
        code="(_args, { context }) => context.username === 'admin' ? 'ALLOW' : 'DENY' ",
    )

    g.auth(Auth.basic(["admin"]))

    list_typegraphs_mat_id = runtimes.register_typegate_materializer(
        store, TypegateOperation.LIST_TYPEGRAPHS
    )
    if isinstance(list_typegraphs_mat_id, Err):
        raise Exception(list_typegraphs_mat_id.value)
    list_typegraphs_mat = Materializer(list_typegraphs_mat_id.value, effect=fx.read())

    find_typegraph_mat_id = runtimes.register_typegate_materializer(
        store, TypegateOperation.FIND_TYPEGRAPH
    )
    if isinstance(find_typegraph_mat_id, Err):
        raise Exception(find_typegraph_mat_id.value)
    find_typegraph_mat = Materializer(find_typegraph_mat_id.value, effect=fx.read())

    add_typegraph_mat_id = runtimes.register_typegate_materializer(
        store, TypegateOperation.ADD_TYPEGRAPH
    )
    if isinstance(add_typegraph_mat_id, Err):
        raise Exception(add_typegraph_mat_id.value)
    add_typegraph_mat = Materializer(add_typegraph_mat_id.value, effect=fx.create(True))

    remove_typegraphs_mat_id = runtimes.register_typegate_materializer(
        store, TypegateOperation.REMOVE_TYPEGRAPHS
    )
    if isinstance(remove_typegraphs_mat_id, Err):
        raise Exception(remove_typegraphs_mat_id.value)
    remove_typegraphs_mat = Materializer(
        remove_typegraphs_mat_id.value, effect=fx.delete(True)
    )

    serialized_typegraph_mat_id = runtimes.register_typegate_materializer(
        store,
        TypegateOperation.GET_SERIALIZED_TYPEGRAPH,
    )
    if isinstance(serialized_typegraph_mat_id, Err):
        raise Exception(serialized_typegraph_mat_id.value)
    serialized_typegraph_mat = Materializer(
        serialized_typegraph_mat_id.value, effect=fx.read()
    )

    arg_info_by_path_id = runtimes.register_typegate_materializer(
        store,
        TypegateOperation.GET_ARG_INFO_BY_PATH,
    )
    if isinstance(arg_info_by_path_id, Err):
        raise Exception(arg_info_by_path_id.value)
    arg_info_by_path_mat = Materializer(arg_info_by_path_id.value, effect=fx.read())

    serialized = t.gen(t.string(), serialized_typegraph_mat)

    typegraph = t.struct(
        {
            "name": t.string(),
            "url": t.uri(),
        },
        name="Typegraph",
    )
    path = t.list(t.string())
    arg_info_inp = t.struct(
        {
            "typegraph": t.string(),
            "queryType": t.string(),
            "fn": t.string(),
            "argPaths": t.list(path),
        }
    )

    shallow_type_info = t.struct(
        {
            "optional": t.boolean(),
            "title": t.string(),
            "type": t.string(),
            "enum": t.list(t.json()).optional(),
            "default": t.json().optional(),
            "format": t.string().optional(),
            "policies": t.list(t.string()),
        },
        name="ShallowTypeInfo",
    )

    type_info = shallow_type_info.extend(
        {
            "fields": t.list(
                t.struct({"subPath": path, "termNode": g.ref("TypeInfo")})
            ).optional(),
        }
    ).rename("TypeInfo")

    operation_parameter = t.struct(
        {
            "name": t.string(),
            "type": type_info,
        }
    )

    operation_info = t.struct(
        {
            "name": t.string(),
            "type": t.enum(["query", "mutation"]),
            "inputs": t.list(operation_parameter),
            "output": type_info,
            "outputItem": type_info.optional(),  # if output is a list
        },
        name="OperationInfo",
    )

    find_available_operations_mat_id = runtimes.register_typegate_materializer(
        store,
        TypegateOperation.FIND_AVAILABLE_OPERATIONS,
    )
    if isinstance(find_available_operations_mat_id, Err):
        raise Exception(find_available_operations_mat_id.value)
    find_list_queries_mat = Materializer(
        find_available_operations_mat_id.value, effect=fx.read()
    )
    find_available_operations = t.func(
        # TODO filters: query/mutation
        t.struct({"typegraph": t.string()}),
        t.list(operation_info),
        find_list_queries_mat,
        rate_calls=True,
    )

    prisma_model_info = t.struct(
        {
            "name": t.string(),
            "runtime": t.string(),
            "fields": t.list(
                t.struct(
                    {
                        "name": t.string(),
                        "as_id": t.boolean(),
                        "type": shallow_type_info,
                    }
                )
            ),
        },
        name="PrismaModelInfo",
    )

    find_prisma_models_mat_id = runtimes.register_typegate_materializer(
        store,
        TypegateOperation.FIND_PRISMA_MODELS,
    )
    if isinstance(find_prisma_models_mat_id, Err):
        raise Exception(find_prisma_models_mat_id.value)
    find_prisma_models_mat = Materializer(
        find_prisma_models_mat_id.value, effect=fx.read()
    )
    find_prisma_models = t.func(
        t.struct({"typegraph": t.string()}),
        t.list(prisma_model_info),
        find_prisma_models_mat,
        rate_calls=True,
    )

    raw_prisma_read_mat_id = runtimes.register_typegate_materializer(
        store, TypegateOperation.RAW_PRISMA_READ
    )
    if isinstance(raw_prisma_read_mat_id, Err):
        raise Exception(raw_prisma_read_mat_id.value)
    raw_prisma_read_mat = Materializer(
        raw_prisma_read_mat_id.value,
        effect=fx.read(),
    )

    raw_prisma_create_mat_id = runtimes.register_typegate_materializer(
        store, TypegateOperation.RAW_PRISMA_CREATE
    )
    if isinstance(raw_prisma_create_mat_id, Err):
        raise Exception(raw_prisma_create_mat_id.value)
    raw_prisma_create_mat = Materializer(
        raw_prisma_create_mat_id.value,
        effect=fx.create(False),
    )

    raw_prisma_update_mat_id = runtimes.register_typegate_materializer(
        store, TypegateOperation.RAW_PRISMA_UPDATE
    )
    if isinstance(raw_prisma_update_mat_id, Err):
        raise Exception(raw_prisma_update_mat_id.value)
    raw_prisma_update_mat = Materializer(
        raw_prisma_update_mat_id.value,
        effect=fx.update(False),
    )

    raw_prisma_delete_mat_id = runtimes.register_typegate_materializer(
        store, TypegateOperation.RAW_PRISMA_DELETE
    )
    if isinstance(raw_prisma_delete_mat_id, Err):
        raise Exception(raw_prisma_delete_mat_id.value)
    raw_prisma_delete_mat = Materializer(
        raw_prisma_delete_mat_id.value,
        effect=fx.delete(False),
    )

    raw_prisma_op_inp = t.struct(
        {
            # typegraph name
            "typegraph": t.string(),
            # prisma runtime name
            "runtime": t.string(),
            "query": prisma_query,
        }
    )
    raw_prisma_op_out = t.json()

    query_prisma_model_mat_id = runtimes.register_typegate_materializer(
        store, TypegateOperation.QUERY_PRISMA_MODEL
    )
    if isinstance(query_prisma_model_mat_id, Err):
        raise Exception(query_prisma_model_mat_id.value)
    query_prisma_model = t.func(
        t.struct(
            {
                "typegraph": t.string(),
                "runtime": t.string(),
                "model": t.string(),
                "offset": t.integer(),
                "limit": t.integer(),
            }
        ),
        t.struct(
            {
                "fields": t.list(
                    t.struct(
                        {
                            "name": t.string(),
                            "as_id": t.boolean(),
                            "type": shallow_type_info,
                        }
                    )
                ),
                "rowCount": t.integer(),
                "data": t.list(t.json()),
            }
        ),
        Materializer(query_prisma_model_mat_id.value, effect=fx.read()),
    )

    g.expose(
        admin_only,
        typegraphs=t.func(
            t.struct({}),
            t.list(typegraph),
            list_typegraphs_mat,
            rate_calls=True,
        ),
        typegraph=t.func(
            t.struct({"name": t.string()}),
            t.optional(typegraph.extend({"serialized": serialized})),
            find_typegraph_mat,
            rate_calls=True,
        ),
        addTypegraph=t.func(
            t.struct(
                {
                    "fromString": t.json(),
                    "secrets": t.json(),
                    "targetVersion": t.string(),
                }
            ),
            t.struct(
                {
                    "name": t.string(),
                    "messages": t.list(
                        t.struct(
                            {
                                "type": t.enum(["info", "warning", "error"]),
                                "text": t.string(),
                            }
                        )
                    ),
                    "migrations": t.list(
                        t.struct(
                            {
                                "runtime": t.string(),
                                "migrations": t.string(),
                            }
                        )
                    ),
                    "failure": t.json().optional(),
                }
            ),
            add_typegraph_mat,
            rate_calls=True,
        ),
        removeTypegraphs=t.func(
            t.struct({"names": t.list(t.string())}),
            t.boolean(),
            remove_typegraphs_mat,
            rate_calls=True,
        ),
        argInfoByPath=t.func(
            arg_info_inp, t.list(type_info), arg_info_by_path_mat, rate_calls=True
        ),
        findAvailableOperations=find_available_operations,
        findPrismaModels=find_prisma_models,
        execRawPrismaRead=t.func(
            raw_prisma_op_inp,
            raw_prisma_op_out,
            raw_prisma_read_mat,
        ),
        execRawPrismaCreate=t.func(
            raw_prisma_op_inp,
            raw_prisma_op_out,
            raw_prisma_create_mat,
        ),
        execRawPrismaUpdate=t.func(
            raw_prisma_op_inp,
            raw_prisma_op_out,
            raw_prisma_update_mat,
        ),
        execRawPrismaDelete=t.func(
            raw_prisma_op_inp,
            raw_prisma_op_out,
            raw_prisma_delete_mat,
        ),
        queryPrismaModel=query_prisma_model,
    )
