from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.http import HTTPRuntime

with TypeGraph("content-type") as g:
    remote = HTTPRuntime("https://content-type.example.com/api")
    public = policies.public()

    output_result = t.struct(
        {
            "self_content_type": t.string(),
            "steps": t.integer(),
            "total": t.integer(),
        }
    ).named("OutputResult")

    sum_range_with_form_data = remote.post(
        "/sum_range",
        t.struct({"start": t.integer(), "end": t.integer()}),
        g("OutputResult"),
        query_fields=(
            "start",
            "end",
        ),
        content_type="multipart/form-data",
    ).add_policy(public)

    g.expose(
        sumRangeWithFormData=sum_range_with_form_data,
    )
