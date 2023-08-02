# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from os import getcwd
from pathlib import Path
from typing import Iterable

import pytest

from typegraph import TypeGraph, t
from typegraph.providers.prisma.relations import (
    AmbiguousSide,
    AmbiguousTargets,
    NoRelationshipFound,
)
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime


META_BIN = str(Path(getcwd()) / "../../target/debug/meta")


class TestRelationships:
    def init_snapshot(self, snapshot):
        snapshot.snapshot_dir = "tests/__snapshots__/prisma-schema"
        self.snapshot = snapshot

    def assert_snapshot(
        self, runtime: PrismaRuntime, models: Iterable[t.struct], snapshot_name: str
    ):
        return self.snapshot.assert_match(
            self.build_relationship(runtime, models), snapshot_name
        )

    def build_relationship(self, runtime: PrismaRuntime, models: Iterable[t.struct]):
        reg = runtime.reg
        for m in models:
            reg.manage(m)

        return {
            name: {
                "left": {
                    "field": rel.left.field,
                    "cardinality": str(rel.left.cardinality),
                },
                "right": {
                    "field": rel.right.field,
                    "cardinality": str(rel.right.cardinality),
                },
            }
            for name, rel in reg.relationships.items()
        }
        return reg.relationships

    def test_simple_model(self, overridable):
        with TypeGraph(""):
            db = PrismaRuntime("test", "POSTGRES")
            model = t.struct(
                {
                    "id": t.integer().as_id.config("auto"),
                    "name": t.string(),
                }
            ).named("ModelA")

            assert self.build_relationship(db, [model]) == overridable({})
            # self.assert_snapshot(db, {model}, "simple-model.prisma")

    def test_one_to_many(self, overridable):
        # self.maxDiff = None

        with TypeGraph(name="test_one_to_many") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.integer().as_id,
                    "posts": db.link(t.array(g("Post")), "postAuthor"),
                }
            ).named("User")

            post = t.struct(
                {
                    "id": t.integer().as_id,
                    "author": db.link(g("User"), "postAuthor"),
                }
            ).named("Post")

            assert self.build_relationship(db, [user, post]) == overridable(
                {
                    "postAuthor": {
                        "left": {"field": "author", "cardinality": "one"},
                        "right": {"field": "posts", "cardinality": "many"},
                    }
                }
            )
            assert self.build_relationship(db, [post, user]) == overridable(
                {
                    "postAuthor": {
                        "left": {"field": "author", "cardinality": "one"},
                        "right": {"field": "posts", "cardinality": "many"},
                    }
                }
            )

    def test_implicit_one_to_many(self, overridable):
        with TypeGraph(name="test_implicit_one_to_many") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {"id": t.integer().as_id.config("auto"), "posts": t.array(g("Post"))}
            ).named("User")

            post = t.struct(
                {"id": t.integer().as_id.config("auto"), "author": g("User")}
            ).named("Post")

            assert self.build_relationship(db, [user, post]) == overridable(
                {
                    "__rel_Post_User_1": {
                        "left": {"field": "author", "cardinality": "one"},
                        "right": {"field": "posts", "cardinality": "many"},
                    }
                }
            )
            assert self.build_relationship(db, [post, user]) == overridable(
                {
                    "__rel_Post_User_1": {
                        "left": {"field": "author", "cardinality": "one"},
                        "right": {"field": "posts", "cardinality": "many"},
                    }
                }
            )

    def test_optional_one_to_many(self, overridable):
        with TypeGraph(name="test_optional_one_to_many") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {"id": t.integer().as_id.config("auto"), "posts": t.array(g("Post"))}
            ).named("User")

            post = t.struct(
                {"id": t.integer().as_id.config("auto"), "author": g("User").optional()}
            ).named("Post")

            assert self.build_relationship(db, [post, user]) == overridable(
                {
                    "__rel_Post_User_1": {
                        "left": {"field": "author", "cardinality": "optional"},
                        "right": {"field": "posts", "cardinality": "many"},
                    }
                }
            )
            assert self.build_relationship(db, [user, post]) == overridable(
                {
                    "__rel_Post_User_1": {
                        "left": {"field": "author", "cardinality": "optional"},
                        "right": {"field": "posts", "cardinality": "many"},
                    }
                }
            )

    def test_one_to_one(self, overridable):
        with TypeGraph(name="test_one_to_one") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.integer().as_id,
                    "profile": db.link(g("Profile").optional(), "userProfile"),
                }
            ).named("User")

            profile = t.struct(
                {
                    "id": t.uuid().as_id.config("auto"),
                    "user": db.link(g("User"), "userProfile"),
                }
            ).named("Profile")

            assert self.build_relationship(db, [user, profile]) == overridable(
                {
                    "userProfile": {
                        "left": {"field": "user", "cardinality": "one"},
                        "right": {"field": "profile", "cardinality": "optional"},
                    }
                }
            )
            assert self.build_relationship(db, [profile, user]) == overridable(
                {
                    "userProfile": {
                        "left": {"field": "user", "cardinality": "one"},
                        "right": {"field": "profile", "cardinality": "optional"},
                    }
                }
            )

    def test_implicit_one_to_one(self, overridable):
        with TypeGraph(name="test_implicit_one_to_one") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.integer().as_id.config("auto"),
                    "profile": g("Profile").optional().config("unique"),
                }
            ).named("User")

            profile = t.struct(
                {"id": t.uuid().as_id.config("auto"), "user": g("User")}
            ).named("Profile")

            assert self.build_relationship(db, [user, profile]) == overridable(
                {
                    "__rel_Profile_User_1": {
                        "left": {"field": "user", "cardinality": "one"},
                        "right": {"field": "profile", "cardinality": "optional"},
                    }
                }
            )
            assert self.build_relationship(db, [profile, user]) == overridable(
                {
                    "__rel_Profile_User_1": {
                        "left": {"field": "user", "cardinality": "one"},
                        "right": {"field": "profile", "cardinality": "optional"},
                    }
                }
            )

    def test_optional_one_to_one(self, overridable):
        with pytest.raises(AmbiguousSide):
            with TypeGraph(name="test_implicit_one_to_one") as g:
                db = PrismaRuntime("test", "POSTGRES")

                user = t.struct(
                    {
                        "id": t.integer().as_id.config("auto"),
                        "profile": g("Profile").optional(),
                    }
                ).named("User")

                profile = t.struct(
                    {
                        "id": t.uuid().as_id.config("auto"),
                        "user": g("User").optional(),
                    }
                ).named("Profile")

                self.build_relationship(db, [user, profile])

        with TypeGraph(name="test_implicit_one_to_one") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.integer().as_id.config("auto"),
                    "profile": g("Profile").optional(),
                }
            ).named("User")

            profile = t.struct(
                {
                    "id": t.uuid().as_id.config("auto"),
                    "user": db.link(g("User").optional(), fkey=True),
                }
            ).named("Profile")

            assert self.build_relationship(db, [user, profile]) == overridable(
                {
                    "__rel_Profile_User_1": {
                        "left": {"field": "user", "cardinality": "optional"},
                        "right": {"field": "profile", "cardinality": "optional"},
                    }
                }
            )
            assert self.build_relationship(db, [profile, user]) == overridable(
                {
                    "__rel_Profile_User_1": {
                        "left": {"field": "user", "cardinality": "optional"},
                        "right": {"field": "profile", "cardinality": "optional"},
                    }
                }
            )

    def test_semi_implicit(self, overridable):
        with TypeGraph(name="test_semi_implicit") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.integer().as_id,
                    "profile": db.link(g("Profile").optional(), "userProfile"),
                }
            ).named("User")

            profile = t.struct(
                {"id": t.uuid().as_id.config("auto"), "user": g("User")}
            ).named("Profile")

            assert self.build_relationship(db, [user, profile]) == overridable(
                {
                    "userProfile": {
                        "left": {"field": "user", "cardinality": "one"},
                        "right": {"field": "profile", "cardinality": "optional"},
                    }
                }
            )
            assert self.build_relationship(db, [profile, user]) == overridable(
                {
                    "userProfile": {
                        "left": {"field": "user", "cardinality": "one"},
                        "right": {"field": "profile", "cardinality": "optional"},
                    }
                }
            )

        with TypeGraph(name="test_semi_implicit_2") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.integer().as_id,
                    "profile": g("Profile").optional(),
                }
            ).named("User")

            profile = t.struct(
                {
                    "id": t.uuid().as_id.config("auto"),
                    "user": db.link(g("User"), "userProfile"),
                }
            ).named("Profile")

            assert self.build_relationship(db, [user, profile]) == overridable(
                {
                    "userProfile": {
                        "left": {"field": "user", "cardinality": "one"},
                        "right": {"field": "profile", "cardinality": "optional"},
                    }
                }
            )
            assert self.build_relationship(db, [profile, user]) == overridable(
                {
                    "userProfile": {
                        "left": {"field": "user", "cardinality": "one"},
                        "right": {"field": "profile", "cardinality": "optional"},
                    }
                }
            )

    def test_one_to_many_self(self, overridable):
        with TypeGraph(name="test_one_to_many_self") as g:
            db = PrismaRuntime("test", "POSTGRES")

            tree_node = t.struct(
                {
                    "id": t.uuid().as_id.config("auto"),
                    "parent": g("TreeNode"),
                    "children": t.array(g("TreeNode")),
                }
            ).named("TreeNode")

            assert self.build_relationship(db, {tree_node}) == overridable(
                {
                    "__rel_TreeNode_TreeNode_2": {
                        "left": {"field": "parent", "cardinality": "one"},
                        "right": {"field": "children", "cardinality": "many"},
                    }
                }
            )

        with TypeGraph(name="test_one_to_many_self_explicit") as g:
            db = PrismaRuntime("test", "POSTGRES")

            tree_node = t.struct(
                {
                    "id": t.uuid().as_id.config("auto"),
                    "parent": db.link(g("TreeNode"), field="children"),
                    "children": db.link(t.array(g("TreeNode")), field="parent"),
                }
            ).named("TreeNode")

            assert self.build_relationship(db, {tree_node}) == overridable(
                {
                    "__rel_TreeNode_TreeNode_2": {
                        "left": {"field": "parent", "cardinality": "one"},
                        "right": {"field": "children", "cardinality": "many"},
                    }
                }
            )

        with TypeGraph(name="test_one_to_many_self_1") as g:
            tree_node = t.struct(
                {
                    "id": t.uuid().as_id.config("auto"),
                    "children": t.array(g("TreeNode")),
                    "parent": g("TreeNode"),
                }
            ).named("TreeNode")

            assert self.build_relationship(db, {tree_node}) == overridable(
                {
                    "__rel_TreeNode_TreeNode_2": {
                        "left": {"field": "parent", "cardinality": "one"},
                        "right": {"field": "children", "cardinality": "many"},
                    }
                }
            )

        with TypeGraph(name="test_one_to_many_self_1_explicit") as g:
            tree_node = t.struct(
                {
                    "id": t.uuid().as_id.config("auto"),
                    "children": db.link(t.array(g("TreeNode")), field="parent"),
                    "parent": db.link(g("TreeNode"), field="children"),
                }
            ).named("TreeNode")

            assert self.build_relationship(db, {tree_node}) == overridable(
                {
                    "__rel_TreeNode_TreeNode_2": {
                        "left": {"field": "parent", "cardinality": "one"},
                        "right": {"field": "children", "cardinality": "many"},
                    }
                }
            )

    def test_one_to_one_self(self, overridable):
        with TypeGraph(name="test_one_to_one_self") as g:
            db = PrismaRuntime("test", "POSTGRES")

            # single-link list node
            list_node = t.struct(
                {
                    "id": t.uuid().as_id.config("auto"),
                    "next": g("ListNode").optional().config("unique"),
                    "prev": g("ListNode").optional(),
                }
            ).named("ListNode")

            assert self.build_relationship(db, {list_node}) == overridable(
                {
                    "__rel_ListNode_ListNode_2": {
                        "left": {"field": "next", "cardinality": "optional"},
                        "right": {"field": "prev", "cardinality": "optional"},
                    }
                }
            )

            # alternative order of fields
            list_node2 = t.struct(
                {
                    "id": t.uuid().as_id.config("auto"),
                    "prev": g("ListNodeAlt").optional(),
                    "next": g("ListNodeAlt").optional().config("unique"),
                }
            ).named("ListNodeAlt")

            assert self.build_relationship(db, {list_node2}) == overridable(
                {
                    "__rel_ListNode_ListNode_2": {
                        "left": {"field": "next", "cardinality": "optional"},
                        "right": {"field": "prev", "cardinality": "optional"},
                    },
                    "__rel_ListNodeAlt_ListNodeAlt_4": {
                        "left": {"field": "next", "cardinality": "optional"},
                        "right": {"field": "prev", "cardinality": "optional"},
                    },
                }
            )

    def test_multiple_relationships(self, overridable):
        with pytest.raises(AmbiguousTargets):
            with TypeGraph(name="test_multiple_relationships") as g:
                db = PrismaRuntime("test", "POSTGRES")

                user = t.struct(
                    {
                        "id": t.uuid().as_id.config("auto"),
                        "email": t.email().config("unique"),
                        "posts": t.array(g("Post")),
                        "favorite_post": t.optional(g("Post")).config("unique"),
                        "published_posts": t.array(g("Post")),
                    }
                ).named("User")

                post = t.struct(
                    {
                        "id": t.uuid().as_id.config("auto"),
                        "title": t.string().min(10).max(256),
                        "content": t.string().min(1000),
                        "author": g("User"),
                        "publisher": g("User").optional(),
                        "favorite_of": t.array(g("User")),
                    }
                ).named("Post")

                self.build_relationship(db, (user, post))

        with TypeGraph(name="test_multiple_relationships") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.uuid().as_id.config("auto"),
                    "email": t.email().config("unique"),
                    "posts": db.link(t.array(g("Post")), field="author"),
                    "favorite_post": t.optional(g("Post")).config("unique"),
                }
            ).named("User")

            post = t.struct(
                {
                    "id": t.uuid().as_id.config("auto"),
                    "title": t.string().min(10).max(256),
                    "content": t.string().min(1000),
                    "author": g("User"),
                    "favorite_of": db.link(t.array(g("User")), field="favorite_post"),
                }
            ).named("Post")

            assert self.build_relationship(db, (user, post)) == overridable(
                {
                    "__rel_Post_User_1": {
                        "left": {"field": "author", "cardinality": "one"},
                        "right": {"field": "posts", "cardinality": "many"},
                    },
                    "__rel_User_Post_2": {
                        "left": {"field": "favorite_post", "cardinality": "optional"},
                        "right": {"field": "favorite_of", "cardinality": "many"},
                    },
                }
            )
            assert self.build_relationship(db, (post, user)) == overridable(
                {
                    "__rel_Post_User_1": {
                        "left": {"field": "author", "cardinality": "one"},
                        "right": {"field": "posts", "cardinality": "many"},
                    },
                    "__rel_User_Post_2": {
                        "left": {"field": "favorite_post", "cardinality": "optional"},
                        "right": {"field": "favorite_of", "cardinality": "many"},
                    },
                }
            )

        with TypeGraph(name="test_multiple_relationships") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.uuid().as_id.config("auto"),
                    "email": t.email().config("unique"),
                    "posts": db.link(t.array(g("Post")), field="author"),
                    "published_posts": db.link(
                        t.array(g("Post")), name="PostPublisher"
                    ),
                    "favorite_post": t.optional(g("Post")).config("unique"),
                }
            ).named("User")

            post = t.struct(
                {
                    "id": t.uuid().as_id.config("auto"),
                    "title": t.string().min(10).max(256),
                    "content": t.string().min(1000),
                    "author": g("User"),
                    "publisher": db.link(g("User").optional(), name="PostPublisher"),
                    "favorite_of": db.link(t.array(g("User")), field="favorite_post"),
                    # "favorite_of": t.array(g("User")),
                }
            ).named("Post")

            assert self.build_relationship(db, (user, post)) == overridable(
                {
                    "__rel_Post_User_1": {
                        "left": {"field": "author", "cardinality": "one"},
                        "right": {"field": "posts", "cardinality": "many"},
                    },
                    "PostPublisher": {
                        "left": {"field": "publisher", "cardinality": "optional"},
                        "right": {"field": "published_posts", "cardinality": "many"},
                    },
                    "__rel_User_Post_3": {
                        "left": {"field": "favorite_post", "cardinality": "optional"},
                        "right": {"field": "favorite_of", "cardinality": "many"},
                    },
                }
            )
            assert self.build_relationship(db, (post, user)) == overridable(
                {
                    "__rel_Post_User_1": {
                        "left": {"field": "author", "cardinality": "one"},
                        "right": {"field": "posts", "cardinality": "many"},
                    },
                    "PostPublisher": {
                        "left": {"field": "publisher", "cardinality": "optional"},
                        "right": {"field": "published_posts", "cardinality": "many"},
                    },
                    "__rel_User_Post_3": {
                        "left": {"field": "favorite_post", "cardinality": "optional"},
                        "right": {"field": "favorite_of", "cardinality": "many"},
                    },
                }
            )

    def test_multi_self_relationships(self, overridable):
        with TypeGraph(name="test_multiple_self_relationships") as g:
            db = PrismaRuntime("test", "POSTGRES")

            person = t.struct(
                {
                    "id": t.uuid().as_id.config("auto"),
                    "personal_hero": db.link(
                        g("Person").optional().config("unique"), field="hero_of"
                    ),
                    "hero_of": g("Person").optional(),
                    "mother": g("Person").optional(),
                    "children": db.link(t.array(g("Person")), field="mother"),
                }
            ).named("Person")

            assert self.build_relationship(db, {person}) == overridable(
                {
                    "__rel_Person_Person_2": {
                        "left": {"field": "personal_hero", "cardinality": "optional"},
                        "right": {"field": "hero_of", "cardinality": "optional"},
                    },
                    "__rel_Person_Person_4": {
                        "left": {"field": "mother", "cardinality": "optional"},
                        "right": {"field": "children", "cardinality": "many"},
                    },
                }
            )

    def test_missing_target(self):
        with pytest.raises(NoRelationshipFound):
            with TypeGraph(name="test_missing_target") as g:
                db = PrismaRuntime("test", "POSTGRES")

                user = t.struct(
                    {
                        "id": t.uuid().as_id.config("auto"),
                        "email": t.email().config("unique"),
                    }
                ).named("User")

                post = t.struct(
                    {
                        "id": t.uuid().as_id.config("auto"),
                        "title": t.string().min(5),
                        "author": g("User"),
                    }
                ).named("Post")

                self.build_relationship(db, (user, post))
