# Copyright Metatype OÜ, licensed under the Elastic License 2.0.
# SPDX-License-Identifier: Elastic-2.0


def remote_sum(inp: dict, ctx) -> float:
    data = ctx.gql(
        query="""
        query q($first: Float!, $second: Float!) {
             sumPy(first: $first, second: $second) 
        }
        """,
        variables=inp,
    )
    sum = data["sumPy"]
    return sum


def sum(inp: dict) -> float:
    return inp["first"] + inp["second"]
