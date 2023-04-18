# skip:start
import yaml

from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import DenoRuntime, PureFunMat

# skip:end

with TypeGraph(
    "programmable-api-gateway",
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    deno = DenoRuntime()

    public = policies.public()
    roulette_access = policies.Policy(PureFunMat("() => Math.random() < 0.5"))

    my_api_format = """
    static_a:
        access: roulette_access
        foo: rab
    static_b:
        access: public
        foo: bar
    """

    exposition = {}
    for field, static_vals in yaml.safe_load(my_api_format).items():
        g.expose(
            **{field: deno.static(t.struct({"foo": t.string()}), static_vals)},
            default_policy=public
            if static_vals.pop("access") == "public"
            else roulette_access
        )
