from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.deno import DenoRuntime

# skip:start
from typegraph.graph.params import Cors

# skip:end


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    name="random-field",
    # skip:end
)
def random_field(g: Graph):
    deno = DenoRuntime()
    pub = Policy.public()

    bonus_items = t.list(t.enum(["+1 gold", "+1 metal"]))
    daily_bonus = t.struct(
        {
            "performance": t.integer(),
            "bonus": bonus_items.from_random(),  # this field is now generated randomly
        }
    )

    # set a custom seed
    g.configure_random_injection(seed=1234)

    g.expose(
        pub,
        get_bonus=deno.func(
            daily_bonus,
            t.string(),
            code="""({ performance, bonus }) => `Daily bonus: ${
                (performance > 100 ? bonus : ['none']).join(', ')
            }`;
            """,
        ),
    )
