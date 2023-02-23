from typegraph import TypeGraph, policies, t
from typegraph.runtimes.http import HTTPRuntime

with TypeGraph("content-type") as g:
    remote = HTTPRuntime("https://content-type.example.com/api")
    public = policies.public()

    sum_range_with_form_data = remote.post(
        "/sum_range",
        t.struct({"start": t.integer(), "end": t.integer()}).named("Range"),
        t.struct(
            {
                "self_content_type": t.string(),
                "steps": t.integer(),
                "total": t.integer(),
            }
        ).named("SumResult"),
        body_fields=(
            "start",
            "end",
        ),
        content_type="multipart/form-data",
    ).add_policy(public)

    # testing which `celcius` is populated first
    celcius_to_farenheit = remote.post(
        "/celcius_to_farenheit/{celcius}?celcius=5678",
        t.struct({"celcius": t.float()}).named("Celcius"),
        t.struct({"farenheit": t.float()}).named("Farenheit"),
        body_fields=("celcius"),
        content_type="multipart/form-data",
    ).add_policy(public)

    g.expose(
        sumRangeWithFormData=sum_range_with_form_data,
        celciusToFarenheit=celcius_to_farenheit,
    )
