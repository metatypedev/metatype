# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Any
from typing import Dict
from typing import Set

from typegraph import t
from typegraph import TypeGraph
from typegraph.graph.nodes import NodeProxy
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime


def tree(typ: t.TypeNode, visited: Set[t.TypeNode] = set()) -> Dict[str, Any]:
    if isinstance(typ, NodeProxy):
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
        return with_children({"[item]": tree(typ.of, visited)})

    if isinstance(typ, t.array):
        return with_children({"[items]": tree(typ.of, visited)})

    if isinstance(typ, t.struct):
        return with_children({k: tree(ty, visited) for k, ty in typ.props.items()})

    return ret


class TestTypeGenerator:
    def test_simple(self, overridable):
        with TypeGraph("test_where_simple"):
            db = PrismaRuntime("test", "POSTGRES")

            model = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
                    "email": t.email(),
                    "age": t.integer().min(0).max(120),
                    "fullName": t.string(),
                }
            ).named("Model")

            assert tree(db.typegen.get_input_type(model)) == overridable(
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

            assert tree(db.typegen.get_where_type(model)) == overridable(
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

            user = t.struct(
                {"id": t.integer().config("id"), "posts": t.array(g("Post"))}
            ).named("User")

            post = t.struct(
                {"id": t.integer().config("id"), "author": g("User")}
            ).named("Post")

            assert tree(db.typegen.get_input_type(user)) == overridable(
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
            assert tree(db.typegen.get_input_type(post)) == overridable(
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

            assert tree(db.typegen.get_where_type(user)) == overridable(
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
            assert tree(db.typegen.get_where_type(post)) == overridable(
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
