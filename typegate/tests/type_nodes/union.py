from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import ModuleMat

with TypeGraph("union") as g:
    user_base_model = t.struct(
        {
            "id": t.uuid(),
            "name": t.string(),
            "age": t.integer(),
        }
    )

    student_materializer = ModuleMat("ts/union/student.ts")

    student_model = t.union((user_base_model, t.struct({"school": t.string()})))

    get_student = t.func(
        t.struct({"id": t.uuid()}),
        student_model,
        student_materializer.imp("get_student"),
    ).add_policy(policies.public())

    worker_model = t.union((user_base_model, t.struct({"company": t.string()})))

    worker_materializer = ModuleMat("ts/union/worker.ts")

    get_worker = t.func(
        t.struct({"id": t.uuid()}),
        worker_model,
        worker_materializer.imp("get_worker"),
    ).add_policy(policies.public())

    g.expose(
        student=get_student,
        worker=get_worker,
    )
