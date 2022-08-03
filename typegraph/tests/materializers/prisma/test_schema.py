from os import environ
from pathlib import Path
from typing import Iterable

import debugpy
import native
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.prisma import PrismaRuntime
from typegraph.materializers.prisma.schema import PrismaSchema
from typegraph.types import typedefs as t


if environ.get("DEBUG", False):
    debugpy.listen(5678)
    print("Waiting for debugger attach...")
    debugpy.wait_for_client()

postgres = environ.get(
    "TEST_POSTGRES_DB", "postgresql://postgres:password@localhost:5432/db?schema=test"
)


class TestPrismaSchema:
    def assert_schema(self, models: Iterable[t.struct], schema: str):
        assert native.format(PrismaSchema(models).build()) == native.format(schema)

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
            db = PrismaRuntime(postgres)

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
            db = PrismaRuntime(postgres)

            userProfile = db.one_to_one(g("User"), g("Profile")).named("userProfile")

            user = t.struct(
                {
                    "id": t.integer().id,
                    "profile": userProfile.owned(),
                }
            ).named("User")

            profile = t.struct(
                {
                    "id": t.integer().id,
                    "user": userProfile.owner(),
                }
            ).named("Profile")

            with open(
                Path(__file__).parent.joinpath("schemas/one_to_one.prisma"), "r"
            ) as f:
                self.assert_schema([user, profile], f.read())
