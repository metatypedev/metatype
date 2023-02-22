import json
from pathlib import Path

import respx
from httpx import Response

from typegraph import TypeGraph
from typegraph import policies as p
from typegraph.importers.openapi import OpenApiImporter

with open(Path(__file__).parent.joinpath("../openapi_schema.json")) as f:
    spec = json.load(f)

with respx.mock:
    url = "https://petstore3.swagger.io/api/v3/openapi.json"
    m = respx.get(url).mock(return_value=Response(200, json=spec))
    OpenApiImporter("petstore", url=url).imp(True)
    assert m.called


def import_petstore():
    pass


with TypeGraph(name="OpenAPI") as g:
    petstore = import_petstore()

    g.expose(**{name: fn.add_policy(p.public()) for name, fn in petstore.all().items()})
