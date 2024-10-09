from .handlers_types import (
    Composites,
    typed_cycles,
    Primitives,
    typed_composites,
    Cycles1,
    typed_primitives,
    SimpleCycles1,
    typed_simple_cycles,
    Ctx,
)
from . import handlers_types as types


@typed_primitives
def primitives(inp: types.PrimitivesArgs, ctx: Ctx) -> Primitives:
    return inp.data


@typed_composites
def composites(inp: types.CompositesArgs, ctx: Ctx) -> Composites:
    return inp.data


@typed_cycles
def cycles(inp: types.Cycles1Args, ctx: Ctx) -> Cycles1:
    return inp.data


@typed_simple_cycles
def simple_cycles(inp: types.SimpleCycles1Args, ctx: Ctx) -> SimpleCycles1:
    return inp.data
