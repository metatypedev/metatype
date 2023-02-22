from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import ModuleMat

with TypeGraph("either") as g:
    # user models

    kid = t.struct(
        {"age": t.integer().min(5).max(16), "name": t.string(), "school": t.string()}
    ).named("Kid")

    teen = t.struct(
        {"age": t.integer().min(17).max(24), "name": t.string(), "college": t.string()}
    ).named("Teen")

    adult = t.struct(
        {"age": t.integer().min(25), "name": t.string(), "company": t.string()}
    ).named("Adult")

    user = t.either((kid, teen, adult)).named("User")

    # transaction models

    success_transaction = t.struct({"user_id": t.string(), "date": t.date()})

    failed_transaction = t.struct({"reason": t.string()})

    response = t.either((success_transaction, failed_transaction)).named("Response")

    user_register_materializer = ModuleMat("ts/either/user_register.ts")

    public = policies.public()

    regist_user = t.func(
        t.struct({"user": user}),
        response,
        user_register_materializer.imp("regist_user"),
    ).add_policy(public)

    g.expose(regist_user=regist_user)
