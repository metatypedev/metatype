from typing import Iterable
import unittest

import native
from typegraph.types import typedefs as t

from ..schema import PrismaSchema


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
