# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors
from typegraph.runtimes import HttpRuntime


# skip:end
@typegraph(
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def http_runtime(g: Graph):
    pub = Policy.public()

    facts = HttpRuntime("https://uselessfacts.jsph.pl/api/v2/facts")

    g.expose(
        pub,
        facts=facts.get(
            "/random",
            t.struct({"language": t.enum(["en", "de"])}),
            t.struct(
                {
                    "id": t.string(),
                    "text": t.string(),
                    "source": t.string(),
                    "source_url": t.string(),
                    "language": t.string(),
                    "permalink": t.string(),
                }
            ),
        ),
        facts_as_text=facts.get(
            "/random",
            t.struct(
                {
                    "header_accept": t.string().set("text/plain"),
                    "language": t.enum(["en", "de"]),
                }
            ),
            t.string(),
            header_prefix="header_",
        ),
    )
