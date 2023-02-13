# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import subprocess
from os import getcwd
from pathlib import Path
from typing import Iterable

from typegraph import TypeGraph, t
from typegraph.providers.prisma.relations import RelationshipRegister
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime
from typegraph.providers.prisma.schema import build_model

# import debugpy


# if environ.get("DEBUG", False):
#     debugpy.listen(5678)
#     print("Waiting for debugger attach...")
#     debugpy.wait_for_client()


META_BIN = str(Path(getcwd()) / "../target/debug/meta")


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
        spec = RelationshipRegister(runtime)
        for m in models:
            spec.manage(m)
        return reformat_schema("\n".join((build_model(m.name, spec) for m in models)))

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
