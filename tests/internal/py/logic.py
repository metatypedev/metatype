# Copyright Metatype OÜ, licensed under the Elastic License 2.0.
# SPDX-License-Identifier: Elastic-2.0

from .logic_types import Ctx
import json


def remote_sum(inp: dict, ctx: Ctx) -> float:
    data = ctx.gql(
        query="""
        query q($first: Float!, $second: Float!) {
             sum(first: $first, second: $second) 
        }
        """,
        variables=json.dumps(inp),
    )
    sum = data["sum"]
    return sum
