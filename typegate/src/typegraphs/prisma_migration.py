from typegraph.gen.exports.runtimes import (
    PrismaMigrationOperation,
)
from typegraph.gen.types import Err
from typegraph import typegraph, t, Graph
from typegraph.graph.params import Auth, Rate
from typegraph.runtimes.deno import DenoRuntime

# we don't want to expose system runtimes to the user, so no client SDK
from typegraph.wit import runtimes, store


@typegraph(
    name="typegate/prisma_migration",
    auths=[Auth.basic(["admin"])],
    rate=Rate(
        window_sec=60,
        window_limit=128,
        query_limit=8,
        local_excess=5,
        context_identifier="user",
    ),
)
def prisma_migration(g: Graph):
    deno = DenoRuntime()
    admin_only = deno.policy(
        "admin_only", code="(_args, { context }) => context.username === 'admin'"
    )

    def _get_operation_func(op: PrismaMigrationOperation):
        params = runtimes.prisma_migration(store, op)
        if isinstance(params, Err):
            raise Exception(params.value)
        return t.func.from_type_func(params.value).with_policy(admin_only)

    g.expose(
        diff=_get_operation_func(PrismaMigrationOperation.DIFF),
        # apply pending migrations
        apply=_get_operation_func(PrismaMigrationOperation.APPLY),
        # create migration
        create=_get_operation_func(PrismaMigrationOperation.CREATE),
        # apply migrations -- prod
        deploy=_get_operation_func(PrismaMigrationOperation.DEPLOY),
        # reset database -- dev
        reset=_get_operation_func(PrismaMigrationOperation.RESET),
    )
