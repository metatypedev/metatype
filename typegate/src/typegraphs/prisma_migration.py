from typegraph.graphs.typegraph import Auth
from typegraph.graphs.typegraph import Rate
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.materializers.prisma import PrismaApplyMat
from typegraph.materializers.prisma import PrismaCreateMat
from typegraph.materializers.prisma import PrismaDeployMat
from typegraph.materializers.prisma import PrismaDiffMat
from typegraph.materializers.prisma import PrismaMigrateMat
from typegraph.policies import Policy
from typegraph.types import types as t

with TypeGraph(
    "typegate/prisma_migration",
    auths=[Auth.basic(["admin"])],
    rate=Rate(
        window_sec=60,
        window_limit=128,
        query_limit=8,
        local_excess=5,
        context_identifier="user",
    ),
) as g:
    admin_only = Policy(FunMat("(args) => args.user === 'admin'")).named("admin_only")

    g.expose(
        prismaDiff=t.func(
            t.struct(
                {
                    "typegraph": t.string(),
                    "runtime": t.string().optional(),
                    "script": t.boolean(),
                }
            ),
            t.struct(
                {
                    "runtime": t.struct(
                        {"name": t.string(), "connectionString": t.string()}
                    ),
                    "diff": t.string().optional(),
                }
            ),
            PrismaDiffMat(),
        )
        .rate(calls=True)
        .add_policy(admin_only),
        prismaMigrate=t.func(
            t.struct(
                {
                    "typegraph": t.string(),
                    "runtime": t.string().optional(),
                    "name": t.string(),
                }
            ),
            t.string(),
            PrismaMigrateMat(),
        )
        .rate(calls=True)
        .add_policy(admin_only),
        prismaApply=t.func(
            t.struct(
                {
                    "typegraph": t.string(),
                    "runtime": t.string().optional(),
                    "resetDatabase": t.boolean(),
                },
            ),
            t.struct(
                {
                    "databaseReset": t.boolean(),
                    "appliedMigrations": t.array(t.string()),
                }
            ),
            PrismaApplyMat(),
        )
        .rate(calls=True)
        .add_policy(admin_only),
        prismaDeploy=t.func(
            t.struct(
                {
                    "typegraph": t.string(),
                    "runtime": t.string().optional(),
                    "migrations": t.string(),  # tar.gz
                }
            ),
            t.struct(
                {
                    "migrationCount": t.integer(),
                    "appliedMigrations": t.array(t.string()),
                }
            ),
            PrismaDeployMat(),
        )
        .rate(calls=True)
        .add_policy(admin_only),
        prismaCreate=t.func(
            t.struct(
                {
                    "typegraph": t.string(),
                    "runtime": t.string().optional(),
                    "name": t.string(),
                    "apply": t.boolean(),
                }
            ),
            t.struct(
                {
                    "createdMigrationName": t.string(),
                    "appliedMigrations": t.array(t.string()),
                }
            ),
            PrismaCreateMat(),
        )
        .rate(calls=True)
        .add_policy(admin_only),
    )
