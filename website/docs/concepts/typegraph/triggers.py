# skip:start
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.http import HTTPRuntime

# skip:end
with TypeGraph("triggers") as g:
    # skip:start
    public = policies.public()
    http = HTTPRuntime("https://random.org/api")
    # skip:end
    # ...
    g.expose(
        flip=t.func(
            t.struct({}),
            t.enum(["head", "tail"]),
            http.get("/flip_coin"),
        ).add_policy(public),
    )
