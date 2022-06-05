from typegraph.materializers import worker
from typegraph.types import typedefs as t


def allow_all(name: str = "__allow_all"):
    return t.policy(
        t.struct(),
        worker.JavascriptMat(
            worker.JavascriptMat.lift(lambda args: True),
            "policy",
        ),
    ).named(name)


def header(name: str = "__allow_all"):
    return t.policy(
        t.struct(),
        worker.JavascriptMat(
            worker.JavascriptMat.lift(lambda args: True),
            "policy",
        ),
    ).named(name)
