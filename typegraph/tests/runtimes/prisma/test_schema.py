# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from os import getcwd
from pathlib import Path
import subprocess
from typing import Iterable

from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime
from typegraph.providers.prisma.schema import build_model
from typegraph.providers.prisma.schema import SourceOfTruth

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
    def assert_schema(
        self, runtime: PrismaRuntime, models: Iterable[t.struct], schema: str
    ):
        spec = SourceOfTruth(runtime)
        for m in models:
            spec.manage(m)
        generated = reformat_schema(
            "\n".join((build_model(m.name, spec) for m in models))
        )
        assert generated == reformat_schema(schema)

    def test_simple_model(self):
        with TypeGraph(""):
            db = PrismaRuntime("test", "POSTGRES")
            model = t.struct(
                {
                    "id": t.integer().config("id", "auto"),
                    "name": t.string(),
                }
            ).named("ModelA")

            self.assert_schema(
                db,
                {model},
                """
                    model ModelA {
                        id Int @id @default(autoincrement())
                        name String
                    }
                """,
            )

    def test_one_to_many(self):
        self.maxDiff = None

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

            with open(
                Path(__file__).parent.joinpath("schemas/one_to_many.prisma"), "r"
            ) as f:
                self.assert_schema(db, [user, post], f.read())

    def test_one_to_one(self):
        self.maxDiff = None

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

            with open(
                Path(__file__).parent.joinpath("schemas/one_to_one.prisma"), "r"
            ) as f:
                self.assert_schema(db, [user, profile], f.read())
