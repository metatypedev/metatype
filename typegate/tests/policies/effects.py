from typegraph import Graph, Policy, effects, t, typegraph
from typegraph.graph.params import Auth
from typegraph.runtimes.deno import DenoRuntime


@typegraph(
    name="effects",
    auths=[Auth.jwt("native", "jwk", {"name": "HMAC", "hash": {"name": "SHA-256"}})],
)
def tg_effects(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()
    admin_only = Policy.context("role", "admin")

    user = t.struct(
        {
            "id": t.integer(),
            "email": t.email(),
            "password_hash": t.string().with_policy(
                deno.policy("deny_all", "() => false")
            ),
        },
        name="User",
    ).with_policy(
        # {"none": public, "update": current_user_only, "delete": current_user_only}
        Policy.on(read=public, update=admin_only, delete=admin_only)
    )

    g.expose(
        public,
        createUser=deno.func(
            t.struct({"email": t.email(), "password_hash": t.string()}),
            user,
            code="(args) => ({ id: 12, ...args })",
            effect=effects.create(),
        ),
        updateUser=deno.func(
            t.struct(
                {
                    "id": t.integer(),
                    "set": t.struct(
                        {
                            "email": t.email().optional(),
                            "password": t.string().optional(),
                        },
                        min=1,
                    ),
                }
            ),
            user,
            code="({ id, set }) => ({ id, ...(set.email ? { email: set.email }: {}), ...(set.password ? { password_hash: 'xxx' }: {})})",
            effect=effects.update(),
        ),
        deleteUser=deno.func(
            t.struct({"id": t.integer()}),
            user,
            code="({id}) => ({ id, email: 'john@example.com', password_hash: 'xxx'})",
            effect=effects.delete(),
        ),
        findUser=deno.func(
            t.struct({"id": t.integer()}),
            user,
            code="({id}) => ({id, email: 'john@example.com', password_hash: 'xxx'})",
        ),
    )
