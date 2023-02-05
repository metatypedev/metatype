# skip:start
from typegraph import t
from typegraph.runtimes.deno import PureFunMat
from typegraph.runtimes.http import HTTPRuntime
from typegraph.runtimes.http import RESTMat

http = HTTPRuntime("https://random.org/api")


# skip:end
t.func(
    t.struct({"input": t.string()}),
    t.string(),
    PureFunMat("({ input }) => `hello ${input}`"),  # with logic
)

t.func(
    t.struct({}),
    t.enum(["head", "tail"]),
    RESTMat(http, "GET", "/flip_coin"),  # where the logic is
)
