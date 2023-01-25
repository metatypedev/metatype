# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from os import path

from typegraph.importers.base.importer import Codegen
from typegraph.importers.graphql import GraphQLImporter


def test_codegen(snapshot):
    importer = GraphQLImporter(
        "test",
        "https://example.com/api",
        file=path.join(path.dirname(__file__), "graphql_full_introspection.json"),
    )

    snapshot.snapshot_dir = "__snapshots__"
    snapshot.assert_match(
        importer.codegen(Codegen()).res, "graphql_importer_codegen.txt"
    )
