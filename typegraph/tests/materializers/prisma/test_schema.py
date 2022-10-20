# Copyright Metatype under the Elastic License 2.0.

from os import environ
from os import getcwd
from pathlib import Path
import subprocess
from typing import Iterable

from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.prisma import PrismaRuntime
from typegraph.materializers.prisma import PrismaSchema
from typegraph.types import typedefs as t

# import debugpy


# if environ.get("DEBUG", False):
#     debugpy.listen(5678)
#     print("Waiting for debugger attach...")
#     debugpy.wait_for_client()

postgres = environ.get(
    "TEST_POSTGRES_DB", "postgresql://postgres:password@localhost:5432/db?schema=test"
)

META_BIN = str(Path(getcwd()) / "../target/debug/meta")


def reformat_schema(schema: str):
    p = subprocess.run(
        [META_BIN, "prisma", "format"], input=schema, text=True, capture_output=True
    )
    return p.stdout


class TestPrismaSchema:
    def assert_schema(self, models: Iterable[t.struct], schema: str):
        assert reformat_schema(PrismaSchema(models).build()) == reformat_schema(schema)

    def test_simple_model(self):
        with TypeGraph(""):
            model = t.struct(
                {
                    "id": t.integer().id.auto,
                    "name": t.string(),
                }
            ).named("ModelA")

        self.assert_schema(
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
            db = PrismaRuntime("test", postgres)

            postAuthor = db.one_to_many(g("User"), g("Post")).named("postAuthor")

            user = t.struct(
                {
                    "id": t.integer().id,
                    "posts": postAuthor.owned(),
                }
            ).named("User")

            post = t.struct(
                {
                    "id": t.integer().id,
                    "author": postAuthor.owner(),
                }
            ).named("Post")

            with open(
                Path(__file__).parent.joinpath("schemas/one_to_many.prisma"), "r"
            ) as f:
                self.assert_schema([user, post], f.read())

    def test_one_to_one(self):
        self.maxDiff = None

        with TypeGraph(name="test_one_to_one") as g:
            db = PrismaRuntime("test", postgres)

            userProfile = db.one_to_one(g("User"), g("Profile")).named("userProfile")

            user = t.struct(
                {
                    "id": t.integer().id,
                    "profile": userProfile.owned(),
                }
            ).named("User")

            profile = t.struct(
                {
                    "id": t.uuid().id.auto,
                    "user": userProfile.owner(),
                }
            ).named("Profile")

            with open(
                Path(__file__).parent.joinpath("schemas/one_to_one.prisma"), "r"
            ) as f:
                self.assert_schema([user, profile], f.read())
