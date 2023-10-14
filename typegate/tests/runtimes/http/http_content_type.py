from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.http import HttpRuntime


@typegraph()
def content_type(g: Graph):
    remote = HttpRuntime("https://content-type.example.com/api")
    public = Policy.public()

    sum_range_with_form_data = remote.post(
        "/sum_range",
        t.struct({"start": t.integer(), "end": t.integer()}, name="Range"),
        t.struct(
            {
                "self_content_type": t.string(),
                "steps": t.integer(),
                "total": t.integer(),
            },
            name="SumResult",
        ),
        body_fields=(
            "start",
            "end",
        ),
        content_type="multipart/form-data",
    ).with_policy(public)

    qinfos = t.struct(
        {
            "queryUrl": t.string(),
            "formData": t.struct(
                {
                    "celcius": t.float(),
                    "rounded": t.boolean(),
                }
            ),
        },
        name="QInfos",
    )

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
            },
            name="Celcius",
        ),
        t.struct({"farenheit": t.float(), "qinfos": qinfos}, name="Farenheit"),
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
    ).with_policy(public)

    g.expose(
        sumRangeWithFormData=sum_range_with_form_data,
        celciusToFarenheit=celcius_to_farenheit,
    )
