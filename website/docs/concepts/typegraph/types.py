# skip:start
from typegraph import t
from typegraph import TypeGraph

with TypeGraph("types") as g:
    # skip:end
    t.struct(
        {
            "id": t.uuid(),
            "age": t.integer(),
            "cars": t.array(
                t.struct(
                    {
                        "model": t.string(),
                        "name": t.string().optional(),
                    }
                )
            ),
        }
    )
