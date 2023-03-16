# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

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

    return ret


class TestTypeGenerator:
    def test_simple(self, overridable):
        with TypeGraph("test_where_simple"):
            db = PrismaRuntime("test", "POSTGRES")
            typegen = db._PrismaRuntime__typegen

            model = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
                    "email": t.email(),
                    "age": t.integer().min(0).max(120),
                    "fullName": t.string(),
                }
            ).named("Model")

            assert tree(typegen.get_input_type(model)) == overridable(
                {
                    "type": "object",
                    "name": "object_7",
                    "children": {
                        "id": {
                            "type": "optional",
                            "name": "optional_6",
                            "children": {
                                "[item]": {"type": "string", "name": "string_1"}
                            },
                        },
                        "email": {"type": "string", "name": "string_2"},
                        "age": {"type": "integer", "name": "integer_3"},
                        "fullName": {"type": "string", "name": "string_4"},
                    },
                }
            )

            assert tree(typegen.get_where_type(model)) == overridable(
                {
                    "type": "object",
                    "name": "object_12",
                    "children": {
                        "id": {
                            "type": "optional",
                            "name": "optional_8",
                            "children": {
                                "[item]": {"type": "string", "name": "string_1"}
                            },
                        },
                        "email": {
                            "type": "optional",
                            "name": "optional_9",
                            "children": {
                                "[item]": {"type": "string", "name": "string_2"}
                            },
                        },
                        "age": {
                            "type": "optional",
                            "name": "optional_10",
                            "children": {
                                "[item]": {"type": "integer", "name": "integer_3"}
                            },
                        },
                        "fullName": {
                            "type": "optional",
                            "name": "optional_11",
                            "children": {
                                "[item]": {"type": "string", "name": "string_4"}
                            },
                        },
                    },
                }
            )

    def test_relations(self, overridable):
        with TypeGraph("test_relations") as g:
            db = PrismaRuntime("test", "POSTGRES")
            typegen = db._PrismaRuntime__typegen

            user = t.struct(
                {"id": t.integer().config("id"), "posts": t.array(g("Post"))}
            ).named("User")

            post = t.struct(
                {"id": t.integer().config("id"), "author": g("User")}
            ).named("Post")

            assert tree(typegen.get_input_type(user)) == overridable(
                {
                    "type": "object",
                    "name": "object_6",
                    "children": {
                        "id": {"type": "integer", "name": "integer_1"},
                        "posts": {
                            "type": "array",
                            "name": "array_2",
                            "children": {
                                "[items]": {"type": "NodeProxy", "name": "Post"}
                            },
                        },
                    },
                }
            )
            assert tree(typegen.get_input_type(post)) == overridable(
                {
                    "type": "object",
                    "name": "object_7",
                    "children": {
                        "id": {"type": "integer", "name": "integer_4"},
                        "author": {
                            "type": "object",
                            "name": "User",
                            "children": {
                                "id": {"type": "integer", "name": "integer_1"},
                                "posts": {"type": "array", "name": "array_2"},
                            },
                        },
                    },
                }
            )

            assert tree(typegen.get_where_type(user)) == overridable(
                {
                    "type": "object",
                    "name": "object_12",
                    "children": {
                        "id": {
                            "type": "optional",
                            "name": "optional_8",
                            "children": {
                                "[item]": {"type": "integer", "name": "integer_1"}
                            },
                        },
                        "posts": {
                            "type": "optional",
                            "name": "optional_11",
                            "children": {
                                "[item]": {
                                    "type": "object",
                                    "name": "object_10",
                                    "children": {
                                        "id": {
                                            "type": "optional",
                                            "name": "optional_9",
                                            "children": {
                                                "[item]": {
                                                    "type": "integer",
                                                    "name": "integer_4",
                                                }
                                            },
                                        }
                                    },
                                }
                            },
                        },
                    },
                }
            )
            assert tree(typegen.get_where_type(post)) == overridable(
                {
                    "type": "object",
                    "name": "object_17",
                    "children": {
                        "id": {
                            "type": "optional",
                            "name": "optional_13",
                            "children": {
                                "[item]": {"type": "integer", "name": "integer_4"}
                            },
                        },
                        "author": {
                            "type": "optional",
                            "name": "optional_16",
                            "children": {
                                "[item]": {
                                    "type": "object",
                                    "name": "object_15",
                                    "children": {
                                        "id": {
                                            "type": "optional",
                                            "name": "optional_14",
                                            "children": {
                                                "[item]": {
                                                    "type": "integer",
                                                    "name": "integer_1",
                                                }
                                            },
                                        }
                                    },
                                }
                            },
                        },
                    },
                }
            )

    def test_self_relation(self, overridable):
        with TypeGraph("test_self_relation") as g:
            db = PrismaRuntime("test", "POSTGRES")
            typegen = db._PrismaRuntime__typegen

            node = t.struct(
                {
                    "name": t.string().min(2).config("id"),
                    "prev": g("ListNode").optional(),
                    "next": g("ListNode").optional().config("unique"),
                }
            ).named("ListNode")

            assert tree(typegen.get_input_type(node)) == overridable(
                {
                    "type": "object",
                    "name": "object_5",
                    "children": {
                        "name": {"type": "string", "name": "string_1"},
                        "prev": {
                            "type": "optional",
                            "name": "optional_2",
                            "children": {
                                "[item]": {"type": "NodeProxy", "name": "ListNode"}
                            },
                        },
                        "next": {
                            "type": "optional",
                            "name": "optional_3",
                            "children": {
                                "[item]": {"type": "NodeProxy", "name": "ListNode"}
                            },
                        },
                    },
                }
            )

            assert tree(typegen.get_where_type(node)) == overridable(
                {
                    "type": "object",
                    "name": "object_13",
                    "children": {
                        "name": {
                            "type": "optional",
                            "name": "optional_6",
                            "children": {
                                "[item]": {"type": "string", "name": "string_1"}
                            },
                        },
                        "prev": {
                            "type": "optional",
                            "name": "optional_9",
                            "children": {
                                "[item]": {
                                    "type": "object",
                                    "name": "object_8",
                                    "children": {
                                        "name": {
                                            "type": "optional",
                                            "name": "optional_7",
                                            "children": {
                                                "[item]": {
                                                    "type": "string",
                                                    "name": "string_1",
                                                }
                                            },
                                        }
                                    },
                                }
                            },
                        },
                        "next": {
                            "type": "optional",
                            "name": "optional_12",
                            "children": {
                                "[item]": {
                                    "type": "object",
                                    "name": "object_11",
                                    "children": {
                                        "name": {
                                            "type": "optional",
                                            "name": "optional_10",
                                            "children": {
                                                "[item]": {
                                                    "type": "string",
                                                    "name": "string_1",
                                                }
                                            },
                                        }
                                    },
                                }
                            },
                        },
                    },
                }
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

            post = models["post"]

            db._PrismaRuntime__manage(post)
            typegen = db._PrismaRuntime__typegen
            self.assert_snapshot(typegen.get_order_by_type(post), "order_by_2.json")

    def init_snapshot(self, snapshot):
        snapshot.snapshot_dir = "tests/__snapshots__/type_generator"
        self.snapshot = snapshot

    def assert_snapshot(self, tpe: t.typedef, snapshot_name: str):
        import json

        return self.snapshot.assert_match(
            json.dumps(tree(tpe, resolve_proxies=True), indent=4), snapshot_name
        )


def tg_blog(g: TypeGraph):
    return {
        "picture": t.struct(
            {
                "id": t.uuid().config("id", "auto"),
                "url": t.uri(),
                "date_posted": t.date(),
                "text": t.string().optional(),
                "profile_pic_of": g("Profile").optional(),
            }
        ).named("Picture"),
        "profile": t.struct(
            {
                "id": t.uuid().config("id", "auto"),
                "display_name": t.string(),
                "first_name": t.string().optional(),
                "last_name": t.string(),
                "profile_pic": g("Picture").optional().config("unique"),
                "user": g("User"),
            }
        ).named("Profile"),
        "user": t.struct(
            {
                "id": t.uuid().config("id", "auto"),
                "email": t.email().config("unique"),
                "profile": g("Profile").optional(),
            }
        ).named("User"),
    }


def tg_blog_2(g: TypeGraph):
    return {
        "user": t.struct(
            {
                "id": t.integer().config("id"),
                "name": t.string(),
                "age": t.integer().optional(),
                "coinflips": t.array(t.boolean()),
                "city": t.string(),
                "posts": t.array(g("Post")),
                # "posts": db.link(t.array(g("Post")), "userPost"),
                "extended_profile": g("ExtendedProfile").optional(),
            },
        ).named("User"),
        "post": t.struct(
            {
                "id": t.integer().config("id"),
                "title": t.string(),
                "views": t.integer(),
                "likes": t.integer(),
                "published": t.boolean(),
                # "author": db.link(g("User"), "userPost"),
                "author": g("User"),
                # "comments": db.link(t.array(g("Comment")), "postComment"),
                "comments": t.array(g("Comment")),
            }
        ).named("Post"),
        "comment": t.struct(
            {
                "id": t.integer().config("id"),
                "content": t.string(),
                # "related_post": db.link(g("Post"), "postComment"),
                "related_post": g("Post"),
            }
        ).named("Comment"),
        "extended_profile": t.struct(
            {
                "id": t.integer().config("id"),
                "bio": t.string(),
                "user": g("User"),
            }
        ).named("ExtendedProfile"),
    }
