# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors

# skip:end
# highlight-next-line
from typegraph.runtimes import HttpRuntime


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def http_runtime(g: Graph):
    pub = Policy.public()

    # highlight-next-line
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
