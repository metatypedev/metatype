from typegraph import TypeGraph, effects, t
from typegraph import policies as p
from typegraph.graph.models import Auth
from typegraph.runtimes.deno import FunMat, ModuleMat, PureFunMat

with TypeGraph(
    "effects",
    auths=[Auth.jwt("native", "jwk", {"name": "HMAC", "hash": {"name": "SHA-256"}})],
) as g:
    # public = p.public().mat
    public = PureFunMat("() => true")
    mod = ModuleMat("ts/effects.ts")
    # current_user_only = mod.imp("currentUserOnly")
    admin_only = p.ctx("role", "admin")
    user = (
        t.struct(
            {
                "id": t.integer(),
                "email": t.email(),
                "password_hash": t.string().add_policy(
                    FunMat("() => false")
                ),  # deny all
            }
        )
        .named("User")
        .add_policy(
            # {"none": public, "update": current_user_only, "delete": current_user_only}
            {"none": public, "update": admin_only, "delete": admin_only}
        )
    )

    g.expose(
        createUser=t.func(
            t.struct({"email": t.email(), "password_hash": t.string()}),
            user,
            FunMat("(args) => ({ id: 12, ...args })", effect=effects.create()),
        ),
        updateUser=t.func(
            t.struct(
                {
                    "id": t.integer(),
                    "set": t.struct(
                        {
                            "email": t.email().optional(),
                            "password": t.string().optional(),
                        }
                    ).min(1),
                }
            ),
            user,
            FunMat(
                "({ id, set }) => ({ id, ...(set.email ? { email: set.email }: {}), ...(set.password ? { password_hash: 'xxx' }: {})})",
                effect=effects.update(),
            ),
        ),
        deleteUser=t.func(
            t.struct({"id": t.integer()}),
            user,
            FunMat(
                "({id}) => ({ id, email: 'john@example.com', password_hash: 'xxx'})",
                effect=effects.delete(),
            ),
        ),
        findUser=t.func(
            t.struct({"id": t.integer()}),
            user,
            PureFunMat(
                "({id}) => ({id, email: 'john@example.com', password_hash: 'xxx'})"
            ),
        ),
        default_policy=[p.public()],
    )
