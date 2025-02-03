# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import typegraph, t, Graph
from typegraph import effects
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def visibility(g: Graph):
    deno = DenoRuntime()
    pass_through = deno.policy("passThrough", "() => 'PASS'")
    deny = deno.policy("denyAll", "() => 'DENY'")

    def ctxread(pol_name: str):
        return deno.policy(
            pol_name, code=f"(_, {{ context }}) => context?.{pol_name} ?? 'DENY'"
        )

    input = t.struct(
        {
            "one": t.struct(
                {"depthOne": t.struct({"another": t.integer().set(111)})}
            ),  # should skip
            "two": t.struct(
                {
                    "depth_two_one": t.integer().with_policy(
                        deny
                    ),  # should no op on input
                    "depth_two_two": t.list(t.list(t.integer().optional())).optional(),
                }
            ),
        }
    ).rename("InputRec")

    # mutually recursive types demo
    rec_type_inner = t.struct(
        {"self_rec": g.ref("SelfRecursive"), "other": t.integer().optional()}
    ).rename("SelfInner")

    rec_type_root = t.struct(
        {
            "self_rec": g.ref("SelfRecursive"),
            "inner_self": t.list(rec_type_inner),
            "other": t.integer().optional().with_policy(ctxread("control_rec_other")),
        }
    ).rename("SelfRecursive")

    output = t.struct(
        {
            "field_basic_scalar": t.string().with_policy(ctxread("control_basic")),
            "field_list_optional": t.list(
                t.struct(
                    {"inner_one": t.integer(), "inner_two_two": t.integer().optional()}
                ).optional()
            ),
            "field_optional_List": t.list(
                t.list(
                    t.struct(
                        {
                            "inner": t.integer(),
                        }
                    )
                )
            ).optional(),
            "denied": t.list(
                t.list(
                    t.struct(
                        {
                            "field_first": t.string().with_policy(deny),
                            "field_second": t.string(),
                        }
                    ).optional()
                )
            ).optional(),
            "mutually_recursive": t.list(
                t.list(rec_type_root).optional()
            ).optional(),  # should be [[T]]
            "union_scalar": t.union(
                [
                    t.integer(),
                    t.string(),
                ]
            ),
            "union_rec_and_empty_variant": t.union(
                [
                    t.struct(
                        {
                            "inner": t.string().with_policy(
                                ctxread("control_inner_variant")
                            )
                        }
                    ).rename("OnionInner"),
                    t.struct({}).rename("EmptyStuff"),
                    rec_type_root,
                ]
            ).rename("UnionWithRecVariant"),
        }
    )

    g.expose(
        pass_through,
        identity_read=deno.func(
            input, output.optional(), code="() => null", effect=effects.read()
        ),
        identity_update=deno.func(
            input, t.list(output), code="() => []", effect=effects.update()
        ),
    )
