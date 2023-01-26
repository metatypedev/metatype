from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import ModuleMat

with TypeGraph("union") as g:
    server_request = t.struct(
        {
            "expected_response_type": t.enum(
                [
                    "data",
                    "error",
                ]
            )
        }
    )

    server_transformer = ModuleMat("ts/server_transformers.ts")

    server_response = t.union(
        (
            t.struct(
                {"code_status": t.integer(), "data": t.string(), "timestamp": t.date()}
            ),
            t.struct({"code_status": t.integer(), "error_message": t.string()}),
        )
    )

    get_response = t.func(
        server_request,
        server_response,
        server_transformer.imp("get_response"),
    ).add_policy(policies.public())

    g.expose(get_response=get_response)
