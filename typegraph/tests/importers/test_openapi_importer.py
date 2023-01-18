# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from os import path

from typegraph.importers.openapi import Document


def test_codegen(snapshot):
    doc = Document.from_file(
        path.join(path.dirname(__file__), "openapi_spec.json"),
        "http://example.com/api/",
    )

    snapshot.snapshot_dir = "__snapshots__"
    snapshot.assert_match(doc.codegen(), "openapi_importer_codegen.txt")
