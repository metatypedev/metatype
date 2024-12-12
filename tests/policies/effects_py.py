# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, effects, t, typegraph
from typegraph.graph.params import Auth
from typegraph.runtimes.deno import DenoRuntime


@typegraph(name="effects")
def effects_py(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()
    admin_only = Policy.context("role", "admin")
    deny_all = deno.policy("deny_all", "() => 'DENY'")

    user = t.struct(
        {
            "id": t.integer(),
            "email": t.email(),
            "password_hash": t.string().with_policy(deny_all),
        },
        name="User",
    ).with_policy(Policy.on(read=public, update=admin_only, delete=admin_only))

    g.auth(Auth.jwt("native", "jwk", {"name": "HMAC", "hash": {"name": "SHA-256"}}))

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
