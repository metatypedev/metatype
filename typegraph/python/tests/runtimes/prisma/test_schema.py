# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import subprocess
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
from typegraph.providers.prisma.schema import build_model

# import debugpy


# if environ.get("DEBUG", False):
#     debugpy.listen(5678)
#     print("Waiting for debugger attach...")
#     debugpy.wait_for_client()


META_BIN = str(Path(getcwd()) / "../../target/debug/meta")


def reformat_schema(schema: str):
    p = subprocess.run(
        [META_BIN, "prisma", "format"], input=schema, text=True, capture_output=True
    )
    return p.stdout


class TestPrismaSchema:
    def init_snapshot(self, snapshot):
        snapshot.snapshot_dir = "tests/__snapshots__/prisma-schema"
        self.snapshot = snapshot

    def assert_snapshot(
        self, runtime: PrismaRuntime, models: Iterable[t.struct], snapshot_name: str
    ):
        return self.snapshot.assert_match(
            self.build_schema(runtime, models), snapshot_name
        )

    def build_schema(self, runtime: PrismaRuntime, models: Iterable[t.struct]):
        reg = runtime.reg
        for m in models:
            reg.manage(m)
        return reformat_schema("\n".join((build_model(m, reg) for m in models)))

    def test_simple_model(self, snapshot):
        self.init_snapshot(snapshot)
        with TypeGraph(""):
            db = PrismaRuntime("test", "POSTGRES")
            model = t.struct(
                {
                    "id": t.integer().config("id", "auto"),
                    "name": t.string(),
                }
            ).named("ModelA")

            self.assert_snapshot(db, {model}, "simple-model.prisma")

    def test_one_to_many(self, snapshot):
        self.init_snapshot(snapshot)
        # self.maxDiff = None

        with TypeGraph(name="test_one_to_many") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.integer().config("id"),
                    "posts": db.link(t.array(g("Post")), "postAuthor"),
                }
            ).named("User")

            post = t.struct(
                {
                    "id": t.integer().config("id"),
                    "author": db.link(g("User"), "postAuthor"),
                }
            ).named("Post")

            self.assert_snapshot(db, [user, post], "one-to-many.prisma")
            self.assert_snapshot(db, [post, user], "one-to-many-r.prisma")

    def test_implicit_one_to_many(self, snapshot):
        self.init_snapshot(snapshot)
        with TypeGraph(name="test_implicit_one_to_many") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {"id": t.integer().config("id", "auto"), "posts": t.array(g("Post"))}
            ).named("User")

            post = t.struct(
                {"id": t.integer().config("id", "auto"), "author": g("User")}
            ).named("Post")

            self.assert_snapshot(db, [user, post], "implicit-one-to-many.prisma")
            self.assert_snapshot(db, [post, user], "implicit-one-to-many-r.prisma")

    def test_optional_one_to_many(self, snapshot):
        self.init_snapshot(snapshot)
        with TypeGraph(name="test_optional_one_to_many") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {"id": t.integer().config("id", "auto"), "posts": t.array(g("Post"))}
            ).named("User")

            post = t.struct(
                {"id": t.integer().config("id", "auto"), "author": g("User").optional()}
            ).named("Post")

            self.assert_snapshot(db, [user, post], "optional-one-to-many.prisma")
            self.assert_snapshot(db, [post, user], "optional-one-to-many-r.prisma")

    def test_one_to_one(self, snapshot):
        self.init_snapshot(snapshot)
        # self.maxDiff = None

        with TypeGraph(name="test_one_to_one") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.integer().config("id"),
                    "profile": db.link(g("Profile").optional(), "userProfile"),
                }
            ).named("User")

            profile = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
                    "user": db.link(g("User"), "userProfile"),
                }
            ).named("Profile")

            self.assert_snapshot(db, [user, profile], "one-to-one.prisma")
            self.assert_snapshot(db, [profile, user], "one-to-one-r.prisma")

    def test_implicit_one_to_one(self, snapshot):
        self.init_snapshot(snapshot)

        with TypeGraph(name="test_implicit_one_to_one") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.integer().config("id", "auto"),
                    "profile": g("Profile").optional().config("unique"),
                }
            ).named("User")

            profile = t.struct(
                {"id": t.uuid().config("id", "auto"), "user": g("User")}
            ).named("Profile")

            self.assert_snapshot(db, [user, profile], "implicit-one-to-one.prisma")
            self.assert_snapshot(db, [profile, user], "implicit-one-to-one-r.prisma")

    def test_optional_one_to_one(self, snapshot):
        self.init_snapshot(snapshot)

        with pytest.raises(AmbiguousSide):
            with TypeGraph(name="test_implicit_one_to_one") as g:
                db = PrismaRuntime("test", "POSTGRES")

                user = t.struct(
                    {
                        "id": t.integer().config("id", "auto"),
                        "profile": g("Profile").optional(),
                    }
                ).named("User")

                profile = t.struct(
                    {
                        "id": t.uuid().config("id", "auto"),
                        "user": g("User").optional(),
                    }
                ).named("Profile")

                self.build_schema(db, [user, profile])

        with TypeGraph(name="test_implicit_one_to_one") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.integer().config("id", "auto"),
                    "profile": g("Profile").optional(),
                }
            ).named("User")

            profile = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
                    "user": db.link(g("User").optional(), fkey=True),
                }
            ).named("Profile")

            self.assert_snapshot(db, [user, profile], "optional-one-to-one.prisma")
            self.assert_snapshot(db, [profile, user], "optional-one-to-one-r.prisma")

    def test_semi_implicit(self, snapshot):
        self.init_snapshot(snapshot)

        with TypeGraph(name="test_semi_implicit") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.integer().config("id"),
                    "profile": db.link(g("Profile").optional(), "userProfile"),
                }
            ).named("User")

            profile = t.struct(
                {"id": t.uuid().config("id", "auto"), "user": g("User")}
            ).named("Profile")

            self.assert_snapshot(db, [user, profile], "one-to-one.prisma")
            self.assert_snapshot(db, [profile, user], "one-to-one-r.prisma")

        with TypeGraph(name="test_semi_implicit_2") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.integer().config("id"),
                    "profile": g("Profile").optional(),
                }
            ).named("User")

            profile = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
                    "user": db.link(g("User"), "userProfile"),
                }
            ).named("Profile")

            self.assert_snapshot(db, [user, profile], "one-to-one.prisma")
            self.assert_snapshot(db, [profile, user], "one-to-one-r.prisma")

    def test_one_to_many_self(self, snapshot):
        self.init_snapshot(snapshot)

        with TypeGraph(name="test_one_to_many_self") as g:
            db = PrismaRuntime("test", "POSTGRES")

            tree_node = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
                    "parent": g("TreeNode"),
                    "children": t.array(g("TreeNode")),
                }
            ).named("TreeNode")

            self.assert_snapshot(db, {tree_node}, "self-one-to-many.prisma")

        with TypeGraph(name="test_one_to_many_self_explicit") as g:
            db = PrismaRuntime("test", "POSTGRES")

            tree_node = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
                    "parent": db.link(g("TreeNode"), field="children"),
                    "children": db.link(t.array(g("TreeNode")), field="parent"),
                }
            ).named("TreeNode")

            self.assert_snapshot(db, {tree_node}, "self-one-to-many.prisma")

        with TypeGraph(name="test_one_to_many_self_1") as g:
            tree_node = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
                    "children": t.array(g("TreeNode")),
                    "parent": g("TreeNode"),
                }
            ).named("TreeNode")

            self.assert_snapshot(db, {tree_node}, "self-one-to-many-1.prisma")

        with TypeGraph(name="test_one_to_many_self_1_explicit") as g:
            tree_node = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
                    "children": db.link(t.array(g("TreeNode")), field="parent"),
                    "parent": db.link(g("TreeNode"), field="children"),
                }
            ).named("TreeNode")

            self.assert_snapshot(db, {tree_node}, "self-one-to-many-1.prisma")

    def test_one_to_one_self(self, snapshot):
        self.init_snapshot(snapshot)

        with TypeGraph(name="test_one_to_one_self") as g:
            db = PrismaRuntime("test", "POSTGRES")

            # single-link list node
            list_node = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
                    "next": g("ListNode").optional().config("unique"),
                    "prev": g("ListNode").optional(),
                }
            ).named("ListNode")

            self.assert_snapshot(db, {list_node}, "self-one-to-one.prisma")

            # alternative order of fields
            list_node2 = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
                    "prev": g("ListNodeAlt").optional(),
                    "next": g("ListNodeAlt").optional().config("unique"),
                }
            ).named("ListNodeAlt")

            self.assert_snapshot(db, {list_node2}, "self-one-to-one-alt.prisma")

    def test_multiple_relationships(self, snapshot):
        self.init_snapshot(snapshot)

        with pytest.raises(AmbiguousTargets):
            with TypeGraph(name="test_multiple_relationships") as g:
                db = PrismaRuntime("test", "POSTGRES")

                user = t.struct(
                    {
                        "id": t.uuid().config("id", "auto"),
                        "email": t.email().config("unique"),
                        "posts": t.array(g("Post")),
                        "favorite_post": t.optional(g("Post")).config("unique"),
                        "published_posts": t.array(g("Post")),
                    }
                ).named("User")

                post = t.struct(
                    {
                        "id": t.uuid().config("id", "auto"),
                        "title": t.string().min(10).max(256),
                        "content": t.string().min(1000),
                        "author": g("User"),
                        "publisher": g("User").optional(),
                        "favorite_of": t.array(g("User")),
                    }
                ).named("Post")

                self.build_schema(db, (user, post))

        with TypeGraph(name="test_multiple_relationships") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
                    "email": t.email().config("unique"),
                    "posts": db.link(t.array(g("Post")), field="author"),
                    "favorite_post": t.optional(g("Post")).config("unique"),
                }
            ).named("User")

            post = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
                    "title": t.string().min(10).max(256),
                    "content": t.string().min(1000),
                    "author": g("User"),
                    "favorite_of": db.link(t.array(g("User")), field="favorite_post"),
                }
            ).named("Post")

            self.assert_snapshot(db, (user, post), "multi.prisma")
            self.assert_snapshot(db, (post, user), "multi-r.prisma")

        with TypeGraph(name="test_multiple_relationships") as g:
            db = PrismaRuntime("test", "POSTGRES")

            user = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
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
                    "id": t.uuid().config("id", "auto"),
                    "title": t.string().min(10).max(256),
                    "content": t.string().min(1000),
                    "author": g("User"),
                    "publisher": db.link(g("User").optional(), name="PostPublisher"),
                    "favorite_of": db.link(t.array(g("User")), field="favorite_post"),
                    # "favorite_of": t.array(g("User")),
                }
            ).named("Post")

            self.assert_snapshot(db, (user, post), "multi-2.prisma")
            self.assert_snapshot(db, (post, user), "multi-2-r.prisma")

    def test_multi_self_relationships(self, snapshot):
        self.init_snapshot(snapshot)

        with TypeGraph(name="test_multiple_self_relationships") as g:
            db = PrismaRuntime("test", "POSTGRES")

            person = t.struct(
                {
                    "id": t.uuid().config("id", "auto"),
                    "personal_hero": db.link(
                        g("Person").optional().config("unique"), field="hero_of"
                    ),
                    "hero_of": g("Person").optional(),
                    "mother": g("Person").optional(),
                    "children": db.link(t.array(g("Person")), field="mother"),
                }
            ).named("Person")

            self.assert_snapshot(db, {person}, "self-multi.prisma")

    def test_missing_target(self):
        with pytest.raises(NoRelationshipFound):
            with TypeGraph(name="test_missing_target") as g:
                db = PrismaRuntime("test", "POSTGRES")

                user = t.struct(
                    {
                        "id": t.uuid().config("id", "auto"),
                        "email": t.email().config("unique"),
                    }
                ).named("User")

                post = t.struct(
                    {
                        "id": t.uuid().config("id", "auto"),
                        "title": t.string().min(5),
                        "author": g("User"),
                    }
                ).named("Post")

                self.build_schema(db, (user, post))
