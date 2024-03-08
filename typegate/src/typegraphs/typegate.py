# Copyright Metatype under the Elastic License 2.0.

from typegraph import Graph, fx, t, typegraph
from typegraph.gen.exports.runtimes import TypegateOperation
from typegraph.gen.types import Err
from typegraph.graph.params import Auth, Cors, Rate
from typegraph.runtimes.base import Materializer
from typegraph.runtimes.deno import DenoRuntime
from typegraph.wit import runtimes, store


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
        "admin_only", code="(_args, { context }) => context.username === 'admin'"
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
            "as_id": t.boolean(),
            "title": t.string(),
            "type": t.string(),
            "enum": t.list(t.json()).optional(),
            "runtime": t.string(),
            "config": t.json().optional(),
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
                {"fromString": t.json(), "secrets": t.json(), "cliVersion": t.string()}
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
    )
