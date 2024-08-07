import typing
import dataclasses as dc
import json
import urllib.request as request
import urllib.error
import http.client as http_c


@dc.dataclass
class NodeArgValue:
    type_name: str
    value: typing.Any


NodeArgs = typing.Dict[str, NodeArgValue]
Out = typing.TypeVar("Out", covariant=True)


@dc.dataclass
class SelectNode(typing.Generic[Out]):
    node_name: str
    instance_name: str
    args: typing.Optional[NodeArgs]
    sub_nodes: typing.Optional[typing.List["SelectNode"]]
    _phantom: typing.Optional[Out] = None


@dc.dataclass
class QueryNode(typing.Generic[Out], SelectNode[Out]):
    pass


@dc.dataclass
class MutationNode(typing.Generic[Out], SelectNode[Out]):
    pass


ArgT = typing.TypeVar("ArgT")
SelectionT = typing.TypeVar("SelectionT")


class Alias(typing.Generic[SelectionT]):
    def __init__(self, **aliases: SelectionT):
        self.items = aliases


ScalarSelectNoArgs = typing.Union[bool, Alias[typing.Literal[True]], None]
ScalarSelectArgs = typing.Union[ArgT, Alias[ArgT], typing.Literal[False], None]
CompositeSelectNoArgs = typing.Union[
    SelectionT, Alias[SelectionT], typing.Literal[False], None
]
CompositeSelectArgs = typing.Union[
    typing.Tuple[ArgT, SelectionT],
    Alias[typing.Tuple[ArgT, SelectionT]],
    typing.Literal[False],
    None,
]


# FIXME: ideally this would be a TypedDict
# to allow full dict based queries but
# we need to reliably identify SelectionFlags at runtime
# but TypedDicts don't allow instanceof
@dc.dataclass
class SelectionFlags:
    select_all: typing.Union[bool, None] = None


class Selection(typing.TypedDict, total=False):
    _: SelectionFlags


SelectionGeneric = typing.Dict[
    str,
    typing.Union[
        SelectionFlags,
        ScalarSelectNoArgs,
        ScalarSelectArgs[typing.Mapping[str, typing.Any]],
        CompositeSelectNoArgs["SelectionGeneric"],
        # FIXME: should be possible to make SelectionT here `SelectionGeneric` recursively
        # but something breaks
        CompositeSelectArgs[typing.Mapping[str, typing.Any], typing.Any],
    ],
]


@dc.dataclass
class NodeMeta:
    sub_nodes: typing.Optional[typing.Dict[str, typing.Callable[[], "NodeMeta"]]] = None
    arg_types: typing.Optional[typing.Dict[str, str]] = None


def selection_to_nodes(
    selection: SelectionGeneric,
    metas: typing.Dict[str, typing.Callable[[], NodeMeta]],
    parent_path: str,
) -> typing.List[SelectNode[typing.Any]]:
    out = []
    flags = selection.get("_")
    if flags is not None and not isinstance(flags, SelectionFlags):
        raise Exception(
            f"selection field '_' should be of type SelectionFlags but found {type(flags)}"
        )
    select_all = True if flags is not None and flags.select_all else False
    found_nodes = set(selection.keys())
    for node_name, meta_fn in metas.items():
        found_nodes.discard(node_name)

        node_selection = selection.get(node_name)
        if node_selection is False or (node_selection is None and not select_all):
            # this node was not selected
            continue

        meta = meta_fn()

        # we splat out any aliasing of nodes here
        node_instances = (
            [(key, val) for key, val in node_selection.items.items()]
            if isinstance(node_selection, Alias)
            else [(node_name, node_selection)]
        )

        for instance_name, instance_selection in node_instances:
            # print(parent_path, instance_selection, meta.sub_nodes, instance_selection, flags)
            if instance_selection is False or (
                instance_selection is None and not select_all
            ):
                # this instance was not selected
                continue
            if isinstance(instance_selection, Alias):
                raise Exception(
                    f"nested Alias node discovored at {parent_path}.{instance_name}"
                )

            instance_args: typing.Optional[NodeArgs] = None
            if meta.arg_types is not None:
                arg = instance_selection

                if isinstance(arg, tuple):
                    arg = arg[0]

                # arg types are always TypedDicts
                if not isinstance(arg, dict):
                    raise Exception(
                        f"node at {parent_path}.{instance_name} is a node that "
                        + "requires arguments "
                        + f"but detected argument is typeof {type(arg)}"
                    )

                # convert arg dict to NodeArgs
                expected_args = {key: val for key, val in meta.arg_types.items()}
                instance_args = {}
                for key, val in arg.items():
                    ty_name = expected_args.pop(key)
                    if ty_name is None:
                        raise Exception(
                            f"unexpected argument ${key} at {parent_path}.{instance_name}"
                        )
                    instance_args[key] = NodeArgValue(ty_name, val)

            sub_nodes: typing.Optional[typing.List[SelectNode]] = None
            if meta.sub_nodes is not None:
                sub_selections = instance_selection

                # if node requires both selection and arg, it must be
                # a CompositeSelectArgs which is a tuple selection
                if meta.arg_types is not None:
                    if not isinstance(sub_selections, tuple):
                        raise Exception(
                            f"node at {parent_path}.{instance_name} is a composite "
                            + "that requires an argument object "
                            + f"but selection is typeof {type(sub_selections)}"
                        )
                    sub_selections = sub_selections[1]

                elif isinstance(sub_selections, tuple):
                    raise Exception(
                        f"node at {parent_path}.{instance_name} "
                        + "is a composite that takes no arguments "
                        + f"but selection is typeof {type(instance_selection)}",
                    )

                # selection types are always TypedDicts as well
                if not isinstance(sub_selections, dict):
                    raise Exception(
                        f"node at {parent_path}.{instance_name} "
                        + "is a no argument composite but first element of "
                        + f"selection is typeof {type(instance_selection)}",
                    )
                sub_nodes = selection_to_nodes(
                    sub_selections, meta.sub_nodes, f"{parent_path}.{instance_name}"
                )
            node = SelectNode(node_name, instance_name, instance_args, sub_nodes)
            out.append(node)

    found_nodes.discard("_")
    if len(found_nodes) > 0:
        raise Exception(
            f"unexpected nodes found in selection set at {parent_path}: {found_nodes}",
        )
    return out


def convert_query_node_gql(
    node: SelectNode,
    variables: typing.Dict[str, NodeArgValue],
):
    out = (
        f"{node.instance_name}: {node.node_name}"
        if node.instance_name != node.node_name
        else node.node_name
    )
    if node.args is not None:
        arg_row = ""
        for key, val in node.args.items():
            name = f"in{len(variables)}"
            variables[name] = val
            arg_row += f"{key}: ${name}, "
        if len(arg_row):
            out += f"({arg_row[:-2]})"

    if node.sub_nodes is not None:
        sub_node_list = ""
        for node in node.sub_nodes:
            sub_node_list += f"{convert_query_node_gql(node, variables)} "
        out += f" {{ {sub_node_list}}}"
    return out


@dc.dataclass
class GraphQLTransportOptions:
    headers: typing.Dict[str, str]


@dc.dataclass
class GraphQLRequest:
    addr: str
    method: str
    headers: typing.Dict[str, str]
    body: bytes


@dc.dataclass
class GraphQLResponse:
    req: GraphQLRequest
    status: int
    headers: typing.Dict[str, str]
    body: bytes


class GraphQLTransportBase:
    def __init__(
        self,
        addr: str,
        opts: GraphQLTransportOptions,
        ty_to_gql_ty_map: typing.Dict[str, str],
    ):
        self.addr = addr
        self.opts = opts
        self.ty_to_gql_ty_map = ty_to_gql_ty_map

    def build_gql(
        self,
        query: typing.Dict[str, SelectNode],
        ty: typing.Union[typing.Literal["query"], typing.Literal["mutation"]],
        name: str = "",
    ):
        variables: typing.Dict[str, NodeArgValue] = {}
        root_nodes = ""
        for key, node in query.items():
            fixed_node = SelectNode(node.node_name, key, node.args, node.sub_nodes)
            root_nodes += f"  {convert_query_node_gql(fixed_node, variables)}\n"
        args_row = ""
        for key, val in variables.items():
            args_row += f"${key}: {self.ty_to_gql_ty_map[val.type_name]}, "

        if len(args_row):
            args_row = f"({args_row[:-2]})"

        doc = f"{ty} {name}{args_row} {{\n{root_nodes}}}"
        return (doc, {key: val.value for key, val in variables.items()})

    def build_req(
        self,
        doc: str,
        variables: typing.Dict[str, typing.Any],
        opts: typing.Optional[GraphQLTransportOptions] = None,
    ):
        headers = {}
        headers.update(self.opts.headers)
        if opts:
            headers.update(opts.headers)
        headers.update(
            {
                "accept": "application/json",
                "content-type": "application/json",
            }
        )
        data = json.dumps({"query": doc, "variables": variables}).encode("utf-8")
        return GraphQLRequest(
            addr=self.addr,
            method="POST",
            headers=headers,
            body=data,
        )

    def handle_response(self, res: GraphQLResponse):
        if res.status != 200:
            raise Exception(f"graphql request failed with status {res.status}", res)
        if res.headers.get("content-type") != "application/json":
            raise Exception("unexpected content-type in graphql response", res)
        parsed = json.loads(res.body)
        if parsed.get("errors"):
            raise Exception("graphql errors in response", parsed)
        return parsed["data"]


class GraphQLTransportUrlib(GraphQLTransportBase):
    def fetch(
        self,
        doc: str,
        variables: typing.Dict[str, typing.Any],
        opts: typing.Optional[GraphQLTransportOptions],
    ):
        req = self.build_req(doc, variables, opts)
        try:
            with request.urlopen(
                request.Request(
                    url=req.addr, method=req.method, headers=req.headers, data=req.body
                )
            ) as res:
                http_res: http_c.HTTPResponse = res
                return self.handle_response(
                    GraphQLResponse(
                        req,
                        status=http_res.status,
                        body=http_res.read(),
                        headers={key: val for key, val in http_res.headers.items()},
                    )
                )
        except request.HTTPError as res:
            return self.handle_response(
                GraphQLResponse(
                    req,
                    status=res.status or 599,
                    body=res.read(),
                    headers={key: val for key, val in res.headers.items()},
                )
            )
        except urllib.error.URLError as err:
            raise Exception(f"URL error: {err.reason}")

    def query(
        self,
        inp: typing.Dict[str, QueryNode[Out]],
        opts: typing.Optional[GraphQLTransportOptions] = None,
    ) -> typing.Dict[str, Out]:
        doc, variables = self.build_gql({key: val for key, val in inp.items()}, "query")
        # print(doc,variables)
        # return {}
        out = self.fetch(doc, variables, opts)
        return out

    def mutation(
        self,
        inp: typing.Dict[str, MutationNode[Out]],
        opts: typing.Optional[GraphQLTransportOptions] = None,
    ) -> typing.Dict[str, Out]:
        doc, variables = self.build_gql(
            {key: val for key, val in inp.items()}, "mutation"
        )
        out = self.fetch(doc, variables, opts)
        return out


# def queryT[Out](
#     self, inp: typing.Tuple[QueryNode[Out, typing.Any, typing.Any], *QueryNode[Out, typing.Any, typing.Any]]
# ) -> typing.Tuple[*Out]:
#     return ()

# def prepare_query[Args, K, Out](
#     self,
#     argType: type[Args],
#     inp: Callable[[Args], typing.Dict[K, SelectNode[Out, typing.Any, typing.Any]]],
# ) -> PreparedRequest[Args, K, Out]:
#     return PreparedRequest(inp)


class PreparedRequest(typing.Generic[ArgT, Out]):
    def __init__(self, inp: typing.Callable[[ArgT], typing.Dict[str, SelectNode[Out]]]):
        self.inp = inp
        pass

    def do(self, args: ArgT) -> typing.Dict[str, Out]:
        return {}


class QueryGraphBase:
    def __init__(self, ty_to_gql_ty_map: typing.Dict[str, str]):
        self.ty_to_gql_ty_map = ty_to_gql_ty_map

    def graphql_sync(
        self, addr: str, opts: typing.Optional[GraphQLTransportOptions] = None
    ):
        return GraphQLTransportUrlib(
            addr, opts or GraphQLTransportOptions({}), self.ty_to_gql_ty_map
        )


# - - - - - - - - - -- - - - - - -  -- - -  #
