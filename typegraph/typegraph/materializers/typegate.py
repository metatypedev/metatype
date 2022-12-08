# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from attrs import frozen
from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
from typegraph.utils.attrs import always


@frozen
class TypeGraphRuntime(Runtime):
    runtime_name: str = always("typegraph")


@frozen
class TypeMat(Materializer):
    runtime: Runtime = TypeGraphRuntime()
    materializer_name: str = always("getType")


@frozen
class SchemaMat(Materializer):
    runtime: Runtime = TypeGraphRuntime()
    materializer_name: str = always("getSchema")


@frozen
class ResolverMat(Materializer):
    runtime: Runtime = TypeGraphRuntime()
    materializer_name: str = always("resolver")


@frozen
class TypeGateRuntime(Runtime):
    runtime_name: str = always("typegate")


@frozen
class TypeGraphsMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("typegraphs")


@frozen
class TypeGraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("typegraph")


@frozen
class AddTypeGraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("addTypegraph")
    serial: bool = always(True)


@frozen
class RemoveTypeGraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("removeTypegraph")
    serial: bool = always(True)


@frozen
class TypeNodeMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("typenode")


@frozen
class SerializedTypegraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = always("serializedTypegraph")
