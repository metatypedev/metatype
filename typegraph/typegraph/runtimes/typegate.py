# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from attrs import frozen
from typegraph import Effect
from typegraph.runtimes.base import Materializer
from typegraph.runtimes.base import Runtime
from typegraph.utils.attrs import always


@frozen
class TypeGraphRuntime(Runtime):
    runtime_name: str = always("typegraph")


@frozen
class TypeMat(Materializer):
    runtime: Runtime = TypeGraphRuntime()
    materializer_name: str = always("getType")
    effect: Effect = always(Effect.none())


@frozen
class SchemaMat(Materializer):
    runtime: Runtime = TypeGraphRuntime()
    materializer_name: str = always("getSchema")
    effect: Effect = always(Effect.none())


@frozen
class ResolverMat(Materializer):
    runtime: Runtime = TypeGraphRuntime()
    materializer_name: str = always("resolver")
    effect: Effect = always(Effect.none())


@frozen
class TypeGateRuntime(Runtime):
    runtime_name: str = always("typegate")


@frozen
class TypeGraphsMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("typegraphs")
    effect: Effect = always(Effect.none())


@frozen
class TypeGraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("typegraph")
    effect: Effect = always(Effect.none())


@frozen
class AddTypeGraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("addTypegraph")
    effect: Effect = always(Effect.create())


@frozen
class RemoveTypeGraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("removeTypegraph")
    effect: Effect = always(Effect.delete())


# @frozen
# class TypeNodeMat(Materializer):
#     runtime: Runtime = TypeGateRuntime()
#     materializer_name: str = always("typenode")


@frozen
class SerializedTypegraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("serializedTypegraph")
    effect: Effect = always(Effect.none())
