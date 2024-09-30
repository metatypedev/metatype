from .logic_types import (
    RootSumFnInput,
    TypeRootSumFnInputFirstFloat,
    typed_remote_sum,
)


@typed_remote_sum
def remote_sum(inp: RootSumFnInput, ctx) -> TypeRootSumFnInputFirstFloat:
    data = ctx.gql(
        query="""
        query q($first: Float!, $second: Float!) {
             sum(first: $first, second: $second) 
        }
        """,
        variables=inp.__dict__,
    )
    sum = data["sum"]
    return sum
