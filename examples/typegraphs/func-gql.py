# skip:start
from typegraph import typegraph, Policy, t, Graph, fx
from typegraph.graph.params import Cors, Rate

from typegraph.runtimes.deno import DenoRuntime
from typegraph.providers.prisma import PrismaRuntime


@typegraph(
    name="func-gql",
    rate=Rate(window_limit=2000, window_sec=60, query_limit=200),
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def func_gql(g: Graph):
    # skip:end
    deno = DenoRuntime()
    db = PrismaRuntime("db", "POSTGRES")
    idea = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "name": t.string(),
            "desc": t.string().optional(),
            "authorEmail": t.email(),
            "votes": t.list(g.ref("vote")),
        },
        name="idea",
    )
    vote = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "authorEmail": t.email(),
            "idea": g.ref("idea"),
        },
        name="vote",
    )
    # Policy.internal means only custom functions
    # can access these root functions
    g.expose(
        Policy.internal(),
        i_get_idea=db.find_unique(idea),
        i_create_vote=db.create(vote),
    )
    g.expose(
        Policy.public(),
        createIdea=db.create(idea),
        createVote=deno.import_(
            t.struct({"ideaId": t.uuid(), "authorEmail": t.email()}).rename(
                "CreateVoteInput"
            ),
            t.struct(
                {
                    "voteId": t.uuid(),
                    # using `reduce` we improve the API allowing
                    # create calls to get the newly created object
                    # without having to send this data from the
                    # custom funciton
                    "vote": db.find_unique(vote).reduce(
                        {
                            "where": {
                                "id": g.inherit().from_parent("voteId"),
                            },
                        }
                    ),
                }
            ).rename("CreateVoteOutput"),
            module="scripts/createVote.ts",
            name="handle",  # name the exported function to run
            effect=fx.create(),
        ),
    )
