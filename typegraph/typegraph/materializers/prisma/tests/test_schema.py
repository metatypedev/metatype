from os import environ
from pathlib import Path
from typing import Iterable
import unittest

import debugpy
import native
from typegraph.graphs.typegraph import TypeGraph
from typegraph.types import typedefs as t

from .. import PrismaRuntime
from ..schema import PrismaSchema


if environ.get("DEBUG", False):
    debugpy.listen(5678)
    print("Waiting for debugger attach...")
    debugpy.wait_for_client()

postgres = environ.get(
    "TEST_POSTGRES_DB", "postgresql://postgres:password@localhost:5432/db?schema=test"
)


class TestCase(unittest.TestCase):
    def assertSchema(self, models: Iterable[t.struct], schema: str):
        return self.assertEqual(
            native.format(PrismaSchema(models).build()), native.format(schema)
        )


class PrismaSchemaTest(TestCase):
    def test_simple_model(self):
        model = t.struct(
            {
                "id": t.integer().id,
                "name": t.string(),
            }
        ).named("ModelA")

        self.assertSchema(
            {model},
            """
                model ModelA {
                    id Int @id
                    name String
                }
            """,
        )

    def test_one_to_many(self):
        self.maxDiff = None

        with TypeGraph(name="test_one_to_many") as g:
            db = PrismaRuntime(postgres)

            user = t.struct(
                {
                    "id": t.integer().id,
                    "posts": t.list(
                        g("Post", lambda e: db.link(e, relation="postAuthor"))
                    ),
                }
            ).named("User")

            post = t.struct(
                {
                    "id": t.integer().id,
                    "author": g(
                        "User", lambda e: db.link(e, "id", relation="postAuthor")
                    ),
                }
            ).named("Post")

            with open(
                Path(__file__).parent.joinpath("schemas/one_to_many.schema"), "r"
            ) as f:
                self.assertSchema([user, post], f.read())
