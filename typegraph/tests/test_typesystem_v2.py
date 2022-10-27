# Copyright Metatype under the Elastic License 2.0.

from typegraph.graphs.node import build
from typegraph.graphs.node import Collector
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.types import types as t


with TypeGraph(
    "new",
) as g:
    user = t.struct(
        {
            "id": t.string().uuid(),
            "username": t.string().min(4).max(63),
            "email": t.string().email(),
            "website": t.string().uri().optional(),
        }
    ).named("User")

    post = t.struct(
        {
            "id": t.string(),
            "title": t.string().min(10).max(200),
            "content": t.string().min(100),
            "published": t.boolean(),
            "author": user,
        }
    ).named("Post")

    my_policy = t.policy(FunMat(""))

    posts = t.func(t.struct(), t.array(post).max(20), FunMat("")).named("posts")
    find_post = (
        t.func(t.struct({"id": t.string().uuid()}), post.optional(), FunMat(""))
        .named("findPost")
        .add_policy(my_policy)
    )

    query = t.struct({"posts": posts, "findPost": find_post}).named("query")


collector = build(query)

print("-- TYPES --")
for i, n in enumerate(collector.collects[Collector.types]):
    print(i, n.data(collector))
print()

collects = [Collector.materializers, Collector.runtimes, Collector.policies]

for c in collects:
    print(f"-- {c.upper()} --")
    for i, n in enumerate(collector.collects[c]):
        print(i, n)
    print()
