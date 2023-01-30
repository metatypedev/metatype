from typegraph import policies as p
from typegraph import TypeGraph
from typegraph.importers.openapi import OpenApiImporter


OpenApiImporter("petstore", url="https://petstore3.swagger.io/api/v3/openapi.json").imp(
    True
)


def import_petstore():
    pass


with TypeGraph(name="OpenAPI") as g:
    petstore = import_petstore()

    g.expose(**{name: fn.add_policy(p.public()) for name, fn in petstore.all().items()})
