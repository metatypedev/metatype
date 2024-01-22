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

    arg_info_out = t.struct(
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
            "fields": t.list(
                t.struct({"subPath": path, "termNode": g.ref("ArgInfoOut")})
            ).optional(),
        }
    ).rename("ArgInfoOut")

    query_arg = t.struct(
        {
            "name": t.string(),
            "type": arg_info_out,
        }
    )

    query_info = t.struct(
        {
            "name": t.string(),
            "inputs": t.list(query_arg),
            "output": arg_info_out,
            "outputItem": arg_info_out,
        }
    )

    find_list_queries_mat_id = runtimes.register_typegate_materializer(
        store,
        TypegateOperation.FIND_LIST_QUERIES,
    )
    if isinstance(find_list_queries_mat_id, Err):
        raise Exception(find_list_queries_mat_id.value)
    find_list_queries_mat = Materializer(
        find_list_queries_mat_id.value, effect=fx.read()
    )
    find_list_queries = t.func(
        t.struct({"typegraph": t.string()}),
        t.list(query_info),
        find_list_queries_mat,
        rate_calls=True,
    )

    g.expose(
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
            arg_info_inp, t.list(arg_info_out), arg_info_by_path_mat, rate_calls=True
        ),
        findListQueries=find_list_queries,
        default_policy=admin_only,
    )
