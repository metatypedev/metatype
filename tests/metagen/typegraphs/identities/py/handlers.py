# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from . import handlers_types as types
from .handlers_types import (
    Composites,
    Ctx,
    Cycles1,
    Primitives,
    SimpleCycles1,
    typed_composites,
    typed_cycles,
    typed_primitives,
    typed_simple_cycles,
)


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
