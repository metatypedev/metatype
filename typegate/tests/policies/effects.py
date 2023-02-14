from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import PurFunMat

with TypeGraph("effect-policies") as g:

    restricted_field = t.struct(
        {
            "id": t.uuid(),
            "email": t.email(),
            "password_hash": t.string().add_policy(current_user_only),
        }
    ).add_policy(public, update=)
