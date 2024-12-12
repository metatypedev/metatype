# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import typegraph, t, Graph
from typegraph.runtimes import DenoRuntime


@typegraph()
def policies_composition(g: Graph):
    deno = DenoRuntime()

    def ctxread(pol_name: str):
        return deno.policy(pol_name, code=f"(_, {{ context }}) => context.{pol_name}")

    deny = deno.policy("denyAll", code="() => 'DENY' ")
    allow = deno.policy("allowAll", code="() => 'ALLOW' ")
    pass_through = deno.policy("passThrough", code="() => 'PASS' ")  # alt public

    a = t.struct(
        {
            "a": t.string(),
            "b": t.string().with_policy(deny),
        }
    ).rename("A")
    b = t.struct(
        {
            "b": t.string().with_policy(allow),
        }
    ).rename("B")

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
        identity=deno.identity(
            t.struct(
                {
                    "zero": t.string().rename("Zero"),
                    "one": t.string()
                    .rename("One")
                    .with_policy(pass_through, ctxread("D"))
                    .with_policy(allow),
                    "two": t.struct(
                        {
                            "three": t.either([a, b])
                            .rename("Three")
                            .with_policy(allow),
                            "four": t.string().rename("Four"),
                        }
                    ).with_policy(pass_through),
                }
            ),
        ).with_policy(pass_through),
    )
