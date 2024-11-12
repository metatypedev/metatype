# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Auth, Cors
from typegraph.providers.prisma import PrismaRuntime
from typegraph.runtimes.deno import DenoRuntime


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    name="roadmap-policies",
    # skip:end
)
def roadmap(g: Graph):
    pub = Policy.public()
    db = PrismaRuntime("db", "POSTGRES")
    deno = DenoRuntime()

    # skip:start
    bucket = t.struct(
        {
            # auto generate ids during creation
            "id": t.integer(as_id=True, config={"auto": True}),
            "name": t.string(),
            "ideas": t.list(g.ref("idea")),
        },
        name="bucket",
    )

    idea = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "name": t.string(),
            "authorEmail": t.email(),
            "votes": t.list(g.ref("vote")),
            "bucket": g.ref("bucket"),
        },
        name="idea",
    )

    vote = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "authorEmail": t.email(),
            "importance": t.enum(["medium", "important", "critical"]).optional(),
            "desc": t.string().optional(),
            "idea": g.ref("idea"),
        },
        name="vote",
    )
    # skip:end

    # highlight-next-line
    g.auth(Auth.basic(["andim"]))

    # highlight-start
    admins = deno.policy(
        "admins",
        "(_args, { context }) => !!context.username",
    )
    # highlight-end

    g.expose(
        pub,
        # highlight-next-line
        create_bucket=db.create(bucket).with_policy(admins),
        get_buckets=db.find_many(bucket),
        get_idea=db.find_many(idea),
        create_idea=db.create(idea),
        create_vote=db.create(vote),
    )
