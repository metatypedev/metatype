# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from .fdk import (
    Composites,
    handler_cycles,
    Primitives,
    handler_composites,
    Cycles1,
    handler_primitives,
    SimpleCycles1,
    handler_simple_cycles,
    handler_proxy_primitives,
    Ctx,
    SelectionFlags,
)
from . import fdk as types


@handler_primitives
def primitives(inp: types.PrimitivesArgs, ctx: Ctx) -> Primitives:
    return inp["data"]


@handler_composites
def composites(inp: types.CompositesArgs, ctx: Ctx) -> Composites:
    return inp["data"]


@handler_cycles
def cycles(inp: types.Cycles1Args, ctx: Ctx) -> Cycles1:
    return inp["data"]


@handler_simple_cycles
def simple_cycles(inp: types.SimpleCycles1Args, ctx: Ctx) -> SimpleCycles1:
    return inp["data"]


@handler_proxy_primitives
def proxy_primitives(inp: types.PrimitivesArgs, ctx: Ctx) -> Primitives:
    return ctx.host.query(
        ctx.qg.py_primitives(inp, {"_": SelectionFlags(select_all=True)})
    )
