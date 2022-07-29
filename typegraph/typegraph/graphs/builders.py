from dataclasses import dataclass
from typing import List
from typing import Tuple

from frozendict import frozendict
from typegraph.graphs import typegraph
from typegraph.materializers import base
from typegraph.materializers.deno import DenoRuntime
from typegraph.types import typedefs as t


@dataclass(eq=True, frozen=True)
class TypePolicy:
    name: str
    materializer: int


@dataclass(eq=True, frozen=True)
class TypeNode:
    name: str
    typedef: str
    edges: Tuple[int]
    policies: Tuple[int]
    runtime: int
    data: frozendict
    # ticket: int


@dataclass(eq=True, frozen=True)
class TypeMaterializer:
    name: str
    runtime: int
    data: frozendict


@dataclass(eq=True, frozen=True)
class TypeRuntime:
    name: str
    data: frozendict


@dataclass(eq=True, frozen=True)
class Graph:
    types: List[TypeNode]
    materializers: List[TypeMaterializer]
    runtimes: List[TypeRuntime]
    policies: List[TypePolicy]


def build(tg: typegraph.TypeGraph):

    # where
    types = "types"
    materializers = "materializers"
    runtimes = "runtimes"
    policies = "policies"
    # data structure
    indexes = {k: {} for k in [types, materializers, runtimes, policies]}
    counters = {k: 0 for k in indexes.keys()}
    # anti-recursivity
    ticket_cache = {}

    def reserve(where):
        ret = counters[where]
        counters[where] += 1
        return ret

    def idx(where, what, default=None):
        if what not in indexes[where]:
            indexes[where][what] = reserve(where) if default is None else default
        return indexes[where][what]

    def collect(where):
        return [
            what
            for what, ticket in sorted(indexes[where].items(), key=lambda item: item[1])
        ]

    def build(node):
        if isinstance(node, base.Materializer):
            data = {**vars(node)}
            ret = TypeMaterializer(
                name=data.pop("materializer_name"),
                runtime=build(data.pop("runtime")),
                data=frozendict(data),
            )
            return idx(materializers, ret)

        if isinstance(node, base.Runtime):
            data = {**vars(node), **node.data}
            for k, v in data.items():
                if isinstance(v, t.Type):
                    data[k] = build(v)
                if isinstance(v, set):
                    if len(v) > 0 and isinstance(next(iter(v)), t.Type):
                        data[k] = tuple(
                            build(e) for e in sorted(v, key=lambda e: e.node)
                        )
                    else:
                        data[k] = tuple(v)

            ret = TypeRuntime(name=data.pop("runtime_name"), data=frozendict(data))
            return idx(runtimes, ret)

        if isinstance(node, t.Type):

            key = id(node)
            if key in ticket_cache:
                return ticket_cache[key]

            ticket = reserve(types)
            ticket_cache[key] = ticket

            data = node.data
            if isinstance(node, t.func) or isinstance(node, t.gen):
                data["materializer"] = build(node.mat)
                data["input"] = build(node.inp)
                data["output"] = build(node.out)
                assert [node.inp, node.out] == node.edges
            elif isinstance(node, t.struct):
                data["binds"] = frozendict({k: build(v) for k, v in node.of.items()})
            elif isinstance(node, t.list) or isinstance(node, t.optional):
                data["of"] = build(node.of)
            elif isinstance(node, t.injection):
                data["of"] = build(node.of)
            # TODO: optional

            pol = [
                idx(
                    policies,
                    TypePolicy(
                        name=p.node,
                        materializer=build(p.mat),
                    ),
                )
                for p in node.policies
            ]
            edges = [build(e) for e in node.edges]

            ret = TypeNode(
                name=node.node,
                typedef=node.typedef,
                edges=tuple(edges),
                policies=tuple(pol),
                runtime=build(node.runtime),
                data=frozendict(data),
                # ticket=ticket
            )
            return idx(types, ret, ticket)

        if isinstance(node, typegraph.NodeProxy):
            return build(node.get())

        # if node is None:
        #    return node

        raise NotImplementedError(f"cannot build out of {node}")

    for tpe in tg.types:
        if tpe.runtime is not None:
            tpe.propagate_runtime(tpe.runtime)

    subgraph_wrapper = (
        t.struct({field: tpe for field, tpe in tg.exposed.items()})
        .named(tg.name)
        .within(DenoRuntime())
    )

    build(subgraph_wrapper)

    return Graph(
        types=collect(types),
        materializers=collect(materializers),
        runtimes=collect(runtimes),
        policies=collect(policies),
    )
