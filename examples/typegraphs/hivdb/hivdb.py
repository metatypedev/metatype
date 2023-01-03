from typegraph.graphs.typegraph import TypeGraph
from typegraph.importers.graphql import import_graphql

import_graphql("https://hivdb.stanford.edu/graphql", False)

with TypeGraph(name="hivdb") as g:
    pass
