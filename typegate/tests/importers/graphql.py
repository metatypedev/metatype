from typegraph import TypeGraph
from typegraph import policies as p
from typegraph.importers.graphql import GraphQLImporter

# TODO use local graphql (mock)
GraphQLImporter("hivdb", "https://hivdb.stanford.edu/graphql").imp(True)


def import_hivdb():
    pass


with TypeGraph("GraphQL") as g:
    hivdb = import_hivdb()

    public = p.public()
    g.expose(**{name: fn.add_policy(public) for name, fn in hivdb.all().items()})
