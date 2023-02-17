from typegraph import t
from typegraph import TypeGraph
from typegraph import policies as p
from typegraph.runtimes.deno import PureFunMat

with TypeGraph("effect-policies") as g:
    public = p.public()
    current_user_only = PureFunMat("() => true")
    restricted_field = t.struct(
        {
            "id": t.uuid(),
            "email": t.email(),
            "password_hash": t.string().add_policy(current_user_only),
        }
    ).add_policy(public)
