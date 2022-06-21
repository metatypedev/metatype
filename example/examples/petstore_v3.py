from typegraph.graphs.typegraph import TypeGraph
from typegraph.importers.openapi import import_openapi

import_openapi("https://petstore3.swagger.io/api/v3/openapi.json", False)

with TypeGraph(name="petstore-v3") as g:
    pass
