# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from os import path

from typegraph.importers.base.importer import Codegen
from typegraph.importers.openapi import OpenApiImporter


def test_codegen(snapshot):
    importer = OpenApiImporter(
        "test",
        file=path.join(path.dirname(__file__), "openapi_spec.json"),
        base_url="http://example.com/api/",
    )

    snapshot.snapshot_dir = "tests/__snapshots__/importers"
    snapshot.assert_match(
        importer.codegen(Codegen()).res, "openapi_importer_codegen.txt"
    )


def test_type_hint(snapshot):
    importer = OpenApiImporter(
        "test",
        file=path.join(path.dirname(__file__), "openapi_spec.json"),
        base_url="http://example.com/api/",
    )

    snapshot.snapshot_dir = "tests/__snapshots__/importers"
    snapshot.assert_match(
        importer.codegen(Codegen()).res_hint, "openapi_importer_type_hint_codegen.txt"
    )
