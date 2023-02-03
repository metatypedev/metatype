# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from os import path

from typegraph.importers.base.importer import Codegen
from typegraph.importers.openapi import OpenApiImporter


def test_codegen(snapshot):
    importer = OpenApiImporter(
        "test",
        file=path.join(path.dirname(__file__), "openapi_spec.json"),
        base_url="http://example.com/api/",
    )

    snapshot.snapshot_dir = "__snapshots__"
    snapshot.assert_match(
        importer.codegen(Codegen()).res, "openapi_importer_codegen.txt"
    )
