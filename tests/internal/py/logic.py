# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from .fdk import Ctx, handler_remote_sum, RootSumFnInput


@handler_remote_sum
def remote_sum(inp: RootSumFnInput, ctx: Ctx) -> float:
    resp = ctx.gql(
        query="""
        query q($first: Float!, $second: Float!) {
             sum(first: $first, second: $second) 
        }
        """,
        variables=inp,
    )
    sum = resp["data"]["sum"]
    return sum
