# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import typegraph, effects, t, Graph
from typegraph.policy import Policy
from typegraph.runtimes import DenoRuntime


@typegraph()
def policies_composition(g: Graph):
    deno = DenoRuntime()

    def ctxread(pol_name: str):
        return deno.policy(pol_name, code=f"(_, {{ context }}) => context.{pol_name}")

    deny = deno.policy("denyAll", code="() => 'DENY' ")
    allow = deno.policy("allowAll", code="() => 'ALLOW' ")
    pass_through = deno.policy("passThrough", code="() => 'PASS' ")  # alt public

    big_struct = t.struct(
        {
            "one": t.struct(
                {
                    "two": t.struct(
                        {
                            # Note:
                            # The policy on each variant is not hoisted
                            # on the parent struct
                            "three": t.either(
                                [
                                    t.struct({"a": t.integer()}).rename("First"),
                                    t.struct(
                                        {
                                            "b": t.struct(
                                                {
                                                    "c": t.integer().with_policy(
                                                        Policy.on(
                                                            read=allow,
                                                            update=ctxread("depth_4"),
                                                        )
                                                    )
                                                }
                                            )
                                        }
                                    ).rename("Second"),
                                ]
                            ).with_policy(ctxread("depth_3"))
                        }
                    ).with_policy(Policy.on(read=deny, update=ctxread("depth_2")))
                }
            ).with_policy(ctxread("depth_1"))
        }
    )

    g.expose(
        simple_traversal_comp=deno.identity(
            t.struct(
                {
                    "one": t.struct(
                        {
                            "two": t.either([t.integer(), t.string()]).with_policy(
                                deny
                            ),
                            "three": t.either([t.integer(), t.string()]).with_policy(
                                allow
                            ),
                        }
                    ).with_policy(ctxread("control_value")),
                }
            )
        ).with_policy(pass_through),
        single_field_comp=deno.identity(
            t.struct(
                {
                    "abc": t.string()
                    .with_policy(ctxread("A"), ctxread("B"))
                    .with_policy(ctxread("C"))
                }
            )
        ).with_policy(pass_through),
        traversal_comp=deno.func(
            big_struct,
            big_struct,
            code="({ one }) => ({ one })",
            effect=effects.update(),
        ).with_policy(pass_through),
    )
