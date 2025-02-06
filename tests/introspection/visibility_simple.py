# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import typegraph, t, Graph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def visibility_simple(g: Graph):
    deno = DenoRuntime()
    pass_through = deno.policy("passThrough", "() => 'PASS'")
    allow = deno.policy("allowAll", "() => 'ALLOW'")
    deny = deno.policy("denyAll", "() => 'DENY'")

    def ctxread_or_pass_through(pol_name: str):
        return deno.policy(
            pol_name, code=f"(_, {{ context }}) => context?.{pol_name} ?? 'PASS'"
        )

    g.expose(
        ctxread_or_pass_through("root_policy"),
        identity_simple=deno.static(
            t.struct(
                {
                    "a": t.struct(
                        {
                            "a_1": t.struct(
                                {
                                    "a_11_deny_allowed": t.integer().with_policy(
                                        deny
                                    ),  # have access
                                    "a_12": t.integer(),
                                }
                            ),
                            "a_2": t.struct(
                                {
                                    "a_21": t.integer(),
                                }
                            ),
                        }
                    ).with_policy(allow),
                    "b": t.struct(
                        {
                            "b_1": t.struct(
                                {
                                    "b_11_deny": t.integer().with_policy(
                                        deny
                                    ),  # no access
                                    "b_12": t.integer(),
                                }
                            ),
                            "b_2": t.struct(
                                {
                                    "b_21_allow_denied": t.integer().with_policy(
                                        allow
                                    ),  # no access
                                }
                            ).with_policy(deny),  # !
                        }
                    ).with_policy(pass_through),
                }
            ),
            {
                "a": {"a_1": {"a_11_deny_allowed": 1, "a_12": 2}, "a_2": {"a_21": 3}},
                "b": {
                    "b_1": {"b_11_deny": 4, "b_12": 5},
                    "b_2": {"b_21_allow_denied": 6},
                },
            },
        ),
    )
