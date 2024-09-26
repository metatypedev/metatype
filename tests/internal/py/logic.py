from typing import Any
from dataclasses import dataclass
import json


def sub(first: int, second: int) -> int:
    return first - second


@dataclass
class Var:
    first: int
    second: int


def remote_sub(var: Var, ctx: Any) -> int:
    data: Any = ctx.gql(
        query="""
        query ($first: Float!, $second: Float!) {
             sub(first: $first, second: $second) 
        }
        """,
        variables=json.dumps(var),
    )
    return data.sub
