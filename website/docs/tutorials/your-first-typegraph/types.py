# skip:start
from typegraph import t
from typegraph import TypeGraph

with TypeGraph("typecheck") as g:
    # skip:end
    t.struct(
        {
            "name": t.string().max(200),
            "age": t.optional(t.integer()),  # or t.integer().optional()
            "messages": t.array(t.struct({"text": t.string(), "sentAt": t.datetime()})),
        }
    )

    # the typegate will accept data as follow
    {
        "name": "Alan",
        "age": 28,
        "messages": [{"text": "Hello!", "sentAt": "2022-12-28T01:11:10Z"}],
    }

    # and reject invalid data
    {"name": "Turing", "messages": [{"sentAt": 1}]}
