# Copyright Metatype under the Elastic License 2.0.

from typegraph import Graph, fx, t, typegraph
from typegraph.gen.exports.runtimes import (
    TypegateOperation,
)
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

    remove_typegraph_mat_id = runtimes.register_typegate_materializer(
        store, TypegateOperation.REMOVE_TYPEGRAPH
    )
    if isinstance(remove_typegraph_mat_id, Err):
        raise Exception(remove_typegraph_mat_id.value)
    remove_typegraph_mat = Materializer(
        remove_typegraph_mat_id.value, effect=fx.delete(True)
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

    serialized = t.gen(t.string(), serialized_typegraph_mat)

    typegraph = t.struct(
        {
            "name": t.string(),
            "url": t.uri(),
        },
        name="Typegraph",
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
                    "resetRequired": t.list(t.string()),
                }
            ),
            add_typegraph_mat,
            rate_calls=True,
        ),
        removeTypegraph=t.func(
            t.struct({"name": t.string()}),
            t.integer(),
            remove_typegraph_mat,
            rate_calls=True,
        ),
        default_policy=admin_only,
    )
