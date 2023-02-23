from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import ModuleMat

with TypeGraph("optional") as g:
    favoriteColor = t.enum(["red", "blue", "green", "purple"]).named("FavoriteColor")
    countingNumber = t.integer().min(0).named("NonNegativeNumber")

    pollMaterializer = ModuleMat("ts/optional/poll.ts")

    countVotes = t.func(
        t.struct({"votes": t.array(favoriteColor.optional())}),
        t.struct(
            {
                "red": countingNumber,
                "blue": countingNumber,
                "green": countingNumber,
                "purple": countingNumber,
                "blank": countingNumber,
            }
        ),
        pollMaterializer.imp("count_votes"),
    )

    sortVotes = t.func(
        t.struct({"votes": t.array(favoriteColor.optional())}),
        t.array(favoriteColor.optional()),
        pollMaterializer.imp("sort_votes"),
    )

    public = policies.public()

    g.expose(
        countVotes=countVotes.add_policy(public), sortVotes=sortVotes.add_policy(public)
    )
