# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from attrs import frozen

from typegraph import effects
from typegraph.effects import Effect
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import always


@frozen
class TypeGraphRuntime(Runtime):
    runtime_name: str = always("typegraph")


@frozen
class TypeMat(Materializer):
    runtime: Runtime = TypeGraphRuntime()
    materializer_name: str = always("getType")
    effect: Effect = always(effects.none())


@frozen
class SchemaMat(Materializer):
    runtime: Runtime = TypeGraphRuntime()
    materializer_name: str = always("getSchema")
    effect: Effect = always(effects.none())


@frozen
class ResolverMat(Materializer):
    runtime: Runtime = TypeGraphRuntime()
    materializer_name: str = always("resolver")
    effect: Effect = always(effects.none())


@frozen
class TypeGateRuntime(Runtime):
    runtime_name: str = always("typegate")


@frozen
class TypeGraphsMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("typegraphs")
    effect: Effect = always(effects.none())


@frozen
class TypeGraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("typegraph")
    effect: Effect = always(effects.none())


@frozen
class AddTypeGraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("addTypegraph")
    effect: Effect = always(effects.create())


@frozen
class RemoveTypeGraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("removeTypegraph")
    effect: Effect = always(effects.delete())


# @frozen
# class TypeNodeMat(Materializer):
#     runtime: Runtime = TypeGateRuntime()
#     materializer_name: str = always("typenode")


@frozen
class SerializedTypegraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("serializedTypegraph")
    effect: Effect = always(effects.none())
