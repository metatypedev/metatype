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
        flip=http.get("/flip_coin", t.struct({}), t.enum(["head", "tail"])),
        default_policy=[public],
    )
