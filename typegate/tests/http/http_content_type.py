from typegraph import TypeGraph, policies, t
from typegraph.runtimes.http import HTTPRuntime

with TypeGraph("content_type") as g:
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

    qinfos = t.struct(
        {
            "queryUrl": t.string(),
            "formData": t.struct(
                {
                    "celcius": t.float(),
                    "rounded": t.boolean(),
                }
            ),
        }
    ).named("QInfos")

    # testing which `celcius` is populated first
    celcius_to_farenheit = remote.post(
        "/celcius_to_farenheit",
        t.struct(
            {
                "celcius": t.float(),
                "roundedTo": t.boolean().optional(),
                "celcius_query_one": t.float(),
                "celcius_query_two": t.float(),
                "celcius_query_three": t.float(),
            }
        ).named("Celcius"),
        t.struct({"farenheit": t.float(), "qinfos": qinfos}).named("Farenheit"),
        body_fields=(
            "celcius",
            "roundedTo",
        ),
        query_fields=(
            "celcius_query_one",
            "celcius_query_two",
            "celcius_query_three",
        ),
        rename_fields={
            # body
            "roundedTo": "rounded",
            # query params
            "celcius_query_one": "celcius",
            "celcius_query_two": "celcius",
            "celcius_query_three": "the_third",
        },
        content_type="multipart/form-data",
    ).add_policy(public)

    g.expose(
        sumRangeWithFormData=sum_range_with_form_data,
        celciusToFarenheit=celcius_to_farenheit,
    )
