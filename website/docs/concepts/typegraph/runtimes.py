# skip:start
from typegraph import t
from typegraph.runtimes.http import HTTPRuntime

# skip:end
http = HTTPRuntime("https://random.org/api")

# same func as above
t.func(
    t.struct({}),
    t.enum(["head", "tail"]),
    http.get("/flip_coin"),  # implicitly attaches runtime to all types
)
