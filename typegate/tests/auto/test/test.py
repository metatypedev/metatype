# Copyright Metatype under the Elastic License 2.0.

from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import PureFunMat

with TypeGraph("test") as g:
    public_policy = policies.public()

    inp = t.struct({"a": t.integer().named("arg1")}).named("inp")
    out = t.struct({"a": t.integer()}).named("out")

    test = t.func(
        inp,
        out,
        PureFunMat(
            """
                ({ a }: { a: number; }) => {
                    return {
                        a
                    };
                }
                """
        ),
    ).named("f")

    g.expose(test=test, default_policy=public_policy)
