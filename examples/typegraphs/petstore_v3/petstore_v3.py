from typegraph import TypeGraph
from typegraph.importers.openapi import OpenApiImporter

# Needs support for 'application/octet-stream' request body
OpenApiImporter("petstore", url="https://petstore3.swagger.io/api/v3/openapi.json").imp(
    False
)

with TypeGraph(name="petstore-v3") as g:
    pass
