from .logic_types import (
    RootSumFnInput,
    TypeRootSumFnInputFirstFloat,
    typed_remote_sub,
    typed_sub,
)


@typed_remote_sub
def remote_sub(inp: RootSumFnInput, ctx) -> TypeRootSumFnInputFirstFloat:
    data = ctx.gql(
        query="""
        query q($first: Float!, $second: Float!) {
             sub(first: $first, second: $second) 
        }
        """,
        variables=inp,
    )
    return data


@typed_sub
def sub(inp: RootSumFnInput, ctx) -> TypeRootSumFnInputFirstFloat:
    return inp.first - inp.second
