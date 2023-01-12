# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from os import path

from box import Box
import orjson
from typegraph.importers.graphql import codegen


def test_codegen(snapshot):
    with open(
        path.join(path.dirname(__file__), "graphql_full_introspection.json")
    ) as f:
        intros = orjson.loads(f.read())

    snapshot.snapshot_dir = "__snapshots__"
    snapshot.assert_match(codegen(Box(intros)), "graphql_importer_codegen.txt")
