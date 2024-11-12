# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Cors
from typegraph.providers.prisma import PrismaRuntime


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    name="roadmap-prisma",
    # skip:end
)
def roadmap_py(g: Graph):
    pub = Policy.public()
    db = PrismaRuntime("db", "POSTGRES")

    bucket = t.struct(
        {
            "id": t.integer(config={"auto": True}).id(),
            "name": t.string(),
            "ideas": t.list(g.ref("idea")),
        },
        name="bucket",
    )
    idea = t.struct(
        {
            "id": t.uuid(config={"auto": True}).id(),
            "name": t.string(),
            "authorEmail": t.email(),
            "votes": t.list(g.ref("vote")),
            "bucket": g.ref("bucket"),
        },
        name="idea",
    )
    vote = t.struct(
        {
            "id": t.uuid(config={"auto": True}).id(),
            "authorEmail": t.email(),
            "importance": t.enum(["medium", "important", "critical"]).optional(),
            "desc": t.string().optional(),
            "idea": g.ref("idea"),
        },
        name="vote",
    )

    g.expose(
        pub,
        get_buckets=db.find_many(bucket),
        create_bucket=db.create(bucket),
        get_idea=db.find_many(idea),
        create_idea=db.create(idea),
        get_vote=db.create(vote),
    )
