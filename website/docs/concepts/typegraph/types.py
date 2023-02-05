# skip:start
from typegraph import t

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
