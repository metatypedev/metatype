# skip:start
import yaml

from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors
from typegraph.runtimes.deno import DenoRuntime

# skip:end


@typegraph(
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def programmable_api_gateway(g: Graph):
    deno = DenoRuntime()

    public = Policy.public()
    roulette_access = deno.policy("roulette", "() => Math.random() < 0.5")

    my_api_format = """
    static_a:
        access: roulette_access
        foo: rab
    static_b:
        access: public
        foo: bar
    """

    for field, static_vals in yaml.safe_load(my_api_format).items():
        g.expose(
            public if static_vals.pop("access") == "public" else roulette_access,
            **{field: deno.static(t.struct({"foo": t.string()}), static_vals)},
        )
