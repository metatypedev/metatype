# Copyright Metatype under the Elastic License 2.0.

from typegraph.materializers.deno import FunMat
from typegraph.types import typedefs as t


def allow_all(name: str = "__allow_all"):
    return t.policy(
        t.struct(),
        FunMat.from_lambda(lambda args: True),
    ).named(name)


# def header(name: str = "__allow_all"):
#     return t.policy(
#         t.struct(),
#         FunMat.from_lambda(lambda args: True),
#     ).named(name)
