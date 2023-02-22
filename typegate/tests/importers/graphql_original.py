import json
from pathlib import Path

import respx
from httpx import Response

from typegraph import TypeGraph
from typegraph import policies as p
from typegraph.importers.graphql import GraphQLImporter

with open(Path(__file__).parent.joinpath("../introspection.json")) as f:
    spec = json.load(f)

with respx.mock:
    url = "https://hivdb.stanford.edu/graphql"
    m = respx.post(url).mock(return_value=Response(200, json=spec))
    GraphQLImporter("hivdb", url).imp(True)
    assert m.called


def import_hivdb():
    pass


with TypeGraph("GraphQL") as g:
    hivdb = import_hivdb()

    public = p.public()
    g.expose(**{name: fn.add_policy(public) for name, fn in hivdb.all().items()})
