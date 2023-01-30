from typegraph import policies as p
from typegraph import TypeGraph
from typegraph.importers.graphql import GraphQLImporter

# TODO use local graphql (mock)
GraphQLImporter("hivdb", "https://hivdb.stanford.edu/graphql").imp(True)


def import_hivdb():
    pass


with TypeGraph("GraphQL") as g:
    hivdb = import_hivdb()

    public = p.public()
    # TODO expose all
    g.expose(
        mutationPrevalenceSubtypes=hivdb.func("mutationPrevalenceSubtypes").add_policy(
            public
        )
    )
