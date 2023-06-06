# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Any
from typing import Dict
from typing import Set

from typegraph import t
from typegraph import TypeGraph
from typegraph.graph.nodes import NodeProxy
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime


def tree(
    typ: t.TypeNode, visited: Set[t.TypeNode] = set(), resolve_proxies=False
) -> Dict[str, Any]:
    if isinstance(typ, NodeProxy):
        if resolve_proxies:
            typ = typ.get()
        else:
            return {
                "type": "NodeProxy",
                "name": typ.name,
            }

    ret = {
        "type": typ.type,
        "name": typ.name,
    }
    if typ in visited:
        return ret

    visited.add(typ)

    def with_children(children):
        ret["children"] = children
        return ret

    if isinstance(typ, t.optional):
        return with_children({"[item]": tree(typ.of, visited, resolve_proxies)})

    if isinstance(typ, t.array):
        return with_children({"[items]": tree(typ.of, visited, resolve_proxies)})

    if isinstance(typ, t.struct):
        return with_children(
            {k: tree(ty, visited, resolve_proxies) for k, ty in typ.props.items()}
        )

    if isinstance(typ, t.either) or isinstance(typ, t.union):
        return with_children(
            {
                f"[variant_{idx}]": tree(ty, visited, resolve_proxies)
                for idx, ty in enumerate(typ.variants)
            }
        )

    return ret


class TestTypeGenerator:
    def test_simple(self, snapshot):
        self.init_snapshot(snapshot)

        with TypeGraph("test_simple"):
            db = PrismaRuntime("test", "POSTGRES")

            model = t.struct(
                {
                    "id": t.uuid().id().config("auto"),
                    "email": t.email(),
                    "age": t.integer().min(0).max(120),
                    "fullName": t.string(),
                }
            ).named("Model")

            typegen = db._PrismaRuntime__typegen
            self.assert_snapshot(typegen.get_input_type(model), "simple_input.json")
            self.assert_snapshot(typegen.get_where_type(model), "simple_where.json")

    def test_relations(self, snapshot):
        self.init_snapshot(snapshot)

        with TypeGraph("test_relations") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {"id": t.integer().id(), "posts": t.array(g("Post"))}
            ).named("User")

            post = t.struct({"id": t.integer().id(), "author": g("User")}).named("Post")

            typegen = db._PrismaRuntime__typegen
            self.assert_snapshot(typegen.get_input_type(user), "relations_input_1.json")
            self.assert_snapshot(typegen.get_input_type(post), "relations_input_2.json")
            self.assert_snapshot(typegen.get_where_type(user), "relations_where_1.json")
            self.assert_snapshot(typegen.get_where_type(post), "relations_where_2.json")

    def test_self_relation(self, snapshot):
        self.init_snapshot(snapshot)

        with TypeGraph("test_self_relation") as g:
            db = PrismaRuntime("test", "POSTGRES")

            node = t.struct(
                {
                    "name": t.string().min(2).id(),
                    "prev": g("ListNode").optional(),
                    "next": g("ListNode").optional().config("unique"),
                }
            ).named("ListNode")

            typegen = db._PrismaRuntime__typegen
            self.assert_snapshot(
                typegen.get_input_type(node), "self_relation_input.json"
            )
            self.assert_snapshot(
                typegen.get_where_type(node), "self_relation_where.json"
            )

    def test_nested_count(self, snapshot):
        self.init_snapshot(snapshot)

        with TypeGraph("test_nested_count") as g:
            db = PrismaRuntime("test", "POSTGRES")
            typegen = db._PrismaRuntime__typegen
            models = tg_blog(g)

            user = models["user"]

            db._PrismaRuntime__manage(user)
            self.assert_snapshot(typegen.add_nested_count(user), "nested_count.json")

    def test_order_by(self, snapshot):
        self.init_snapshot(snapshot)

        with TypeGraph("test_order_by") as g:
            db = PrismaRuntime("test", "POSTGRES")
            models = tg_blog(g)

            user = models["user"]

            db._PrismaRuntime__manage(user)
            typegen = db._PrismaRuntime__typegen
            self.assert_snapshot(typegen.get_order_by_type(user), "order_by.json")

        with TypeGraph("test_order_by_2") as g:
            db = PrismaRuntime("test", "POSTGRES")
            models = tg_blog_2(g)

            user = models["user"]
            post = models["post"]
            extended_profile = models["extended_profile"]

            db._PrismaRuntime__manage(post)
            typegen = db._PrismaRuntime__typegen
            self.assert_snapshot(
                typegen.get_order_by_type(user), "order_by_2_user.json"
            )
            self.assert_snapshot(
                typegen.get_order_by_type(post), "order_by_2_post.json"
            )
            self.assert_snapshot(
                typegen.get_order_by_type(extended_profile),
                "order_by_2_extended_profile.json",
            )

    def init_snapshot(self, snapshot):
        snapshot.snapshot_dir = "tests/__snapshots__/type_generator"
        self.snapshot = snapshot

    def assert_snapshot(self, tpe: t.typedef, snapshot_name: str):
        import json

        return self.snapshot.assert_match(
            json.dumps(tree(tpe, resolve_proxies=True), indent=4) + "\n", snapshot_name
        )


def tg_blog(g: TypeGraph):
    return {
        "picture": t.struct(
            {
                "id": t.uuid().id().config("auto"),
                "url": t.uri(),
                "date_posted": t.date(),
                "text": t.string().optional(),
                "profile_pic_of": g("Profile").optional(),
            }
        ).named("Picture"),
        "profile": t.struct(
            {
                "id": t.uuid().id().config("auto"),
                "display_name": t.string(),
                "first_name": t.string().optional(),
                "last_name": t.string(),
                "profile_pic": g("Picture").optional().config("unique"),
                "user": g("User"),
            }
        ).named("Profile"),
        "user": t.struct(
            {
                "id": t.uuid().id().config("auto"),
                "email": t.email().config("unique"),
                "profile": g("Profile").optional(),
            }
        ).named("User"),
    }


def tg_blog_2(g: TypeGraph):
    return {
        "user": t.struct(
            {
                "id": t.integer().id(),
                "name": t.string(),
                "age": t.integer().optional(),
                "coinflips": t.array(t.boolean()),
                "city": t.string(),
                "posts": t.array(g("Post")),
                "extended_profile": g("ExtendedProfile").optional(),
            },
        ).named("User"),
        "post": t.struct(
            {
                "id": t.integer().id(),
                "title": t.string(),
                "views": t.integer(),
                "likes": t.integer(),
                "published": t.boolean(),
                "author": g("User"),
                "comments": t.array(g("Comment")),
            }
        ).named("Post"),
        "comment": t.struct(
            {
                "id": t.integer().id(),
                "content": t.string(),
                "related_post": g("Post"),
            }
        ).named("Comment"),
        "extended_profile": t.struct(
            {
                "id": t.integer().id(),
                "bio": t.string(),
                "user": g("User"),
            }
        ).named("ExtendedProfile"),
    }
