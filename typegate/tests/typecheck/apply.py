from typegraph_next import t, typegraph, Policy, Graph
from typegraph_next.effects import NONE
from typegraph_next.runtimes.deno import DenoRuntime

student = t.struct(
    {
        "id": t.integer(),
        "name": t.string(),
        "infos": t.struct(
            {
                "age": t.integer(min=10),
                "school": t.string().optional(),
            }
        ),
        "distinctions": t.struct(
            {
                "awards": t.array(
                    t.struct(
                        {
                            "name": t.string(),
                            "points": t.integer(),
                        }
                    )
                ).optional(),
                "medals": t.integer().optional(),
            }
        ).optional(),
    },
    name="Student",
)

grades = t.struct(
    {
        "year": t.integer(min=2000),
        "subjects": t.array(
            t.struct(
                {
                    "name": t.string(),
                    "score": t.integer(),
                }
            ),
        ),
    }
)

tpe = t.struct({"student": student, "grades": grades.optional()})


@typegraph()
def test_apply(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()
    identity_student = deno.func(
        tpe, tpe, code="({ student, grades }) => { return { student, grades } }"
    )

    g.expose(
        testInvariant=identity_student.apply(
            {
                "student": {
                    "id": g.inherit(),
                    "name": g.inherit(),
                    "infos": {
                        "age": g.inherit(),
                        "school": g.inherit(),
                    },
                },
                # grades: g.inherit(), // implicit
            }
        ).with_policy(public),
        injectionInherit=identity_student.apply(
            {
                "student": {
                    "id": 1234,
                    "name": g.inherit(),
                    "infos": g.inherit().from_context("personalInfos"),
                },
                "grades": {
                    "year": g.inherit().set(2000),
                    "subjects": g.inherit().from_context(
                        {
                            NONE: "subjects",
                        }
                    ),
                },
            }
        ).with_policy(public),
    )
