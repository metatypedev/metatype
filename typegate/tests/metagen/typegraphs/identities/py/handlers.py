from .handlers_types import (
    Composites,
    typed_cycles,
    Primitives,
    typed_composites,
    Cycles1,
    typed_primitives,
)
from . import handlers_types as types


@typed_primitives
def primitives(inp: types.PrimitivesArgs) -> Primitives:
    return inp.data


@typed_composites
def composites(inp: types.CompositesArgs) -> Composites:
    return inp.data


@typed_cycles
def cycles(inp: types.Cycles1Args) -> Cycles1:
    return inp.data
