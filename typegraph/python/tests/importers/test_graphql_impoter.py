# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from os import path

from typegraph.importers.base.importer import Codegen
from typegraph.importers.graphql import GraphQLImporter


def test_codegen(snapshot):
    importer = GraphQLImporter(
        "test",
        "https://example.com/api",
        file=path.join(path.dirname(__file__), "graphql_full_introspection.json"),
    )

    snapshot.snapshot_dir = "tests/__snapshots__/importers"
    snapshot.assert_match(
        importer.codegen(Codegen()).res, "graphql_importer_codegen.txt"
    )


def test_type_hint(snapshot):
    importer = GraphQLImporter(
        "test",
        "https://example.com/api",
        file=path.join(path.dirname(__file__), "graphql_full_introspection.json"),
    )

    snapshot.snapshot_dir = "tests/__snapshots__/importers"
    snapshot.assert_match(
        importer.codegen(Codegen()).res_hint, "graphql_importer_type_hint_codegen.txt"
    )
