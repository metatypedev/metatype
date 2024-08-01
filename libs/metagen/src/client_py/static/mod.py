from typing import (
    Any,
    Callable,
    Literal,
    TypedDict,
    Mapping,
    TypeVar,
    Generic,
    Dict,
    Tuple,
    List,
    Union,
)
from dataclasses import dataclass, asdict
import json
import urllib.request as request
import urllib.error
import http.client as http_c


@dataclass
class NodeArgValue:
    type_name: str
    value: Any

NodeArgs = Dict[str, NodeArgValue]
Out = TypeVar("Out")


@dataclass
class SelectNode(Generic[Out]):
    name: str
    args: Union[NodeArgs, None]
    sub_nodes: Union[List["SelectNode"], None]
    _phantom: Union[None, Out] = None


@dataclass
class QueryNode(Generic[Out], SelectNode[Out]):
    pass


@dataclass
class MutationNode(Generic[Out], SelectNode[Out]):
    pass


ArgT = TypeVar("ArgT")
SelectionT = TypeVar("SelectionT")

AliasInfo = Dict[str, SelectionT]
ScalarSelectNoArgs = Union[bool, None]  # | AliasInfo['ScalarSelectNoArgs'];
ScalarSelectArgs = Union[
    Tuple[ArgT, None], Literal[False], None
]  # | AliasInfo['ScalarSelectArgs'];
CompositSelectNoArgs = Union[
    Tuple[None, SelectionT], Literal[False], None
]  # | AliasInfo['CompositSelectNoArgs'];
CompositSelectArgs = Union[
    Tuple[ArgT, SelectionT], Literal[False], None
]  # | AliasInfo['CompositSelectArgs'];


@dataclass
class SelectionFlags:
    select_all: Union[bool, None] = None


class Selection(TypedDict, total=False):
    _: SelectionFlags


SelectionGeneric = Dict[
    str,
    Union[
        SelectionFlags,
        ScalarSelectNoArgs,
        ScalarSelectArgs[Mapping[str, Any]],
        CompositSelectNoArgs,
        CompositSelectArgs[Mapping[str, Any], Any],
    ],
]


@dataclass
class NodeMeta:
    sub_nodes: Union[Dict[str, "NodeMeta"], None] = None
    arg_types: Union[Dict[str, str], None] = None


def selection_to_nodes(
    selection: SelectionGeneric, metas: Dict[str, NodeMeta], parent_path: str
) -> List[SelectNode[Any]]:
    out = []
    flags = selection.get("_")
    if flags is not None and not isinstance(flags, SelectionFlags):
        raise Exception(
            f"selection field '_' should be of type SelectionFlags but found {type(flags)}"
        )
    select_all = True if flags is not None and flags.select_all else False
    found_nodes = set(selection.keys())
    for node_name, meta in metas.items():
        found_nodes.remove(node_name)

        node_selection = selection[node_name]
        if (node_selection is None and not select_all) or (node_selection == False):
            # this node was not selected
            continue

        node_args: Union[NodeArgs, None] = None
        if meta.arg_types is not None:
            if not isinstance(node_selection, tuple):
                raise Exception(
                    f"node at {parent_path}.{node_name} is a scalar that "
                    + "requires arguments "
                    + f"but selection is typeof {type(node_selection)}"
                )
            arg = node_selection[0]
            if not isinstance(arg, dict):
                raise Exception(
                    f"node at {parent_path}.{node_name} is a scalar that "
                    + "requires argument object "
                    + f"but first element of selection is typeof {type(node_selection)}"
                )

            expected_args = {key: val for key, val in meta.arg_types.items()}
            node_args = {}
            for key, val in arg.items():
                ty_name = expected_args.pop(key)
                if ty_name is None:
                    raise Exception(
                        f"unexpected argument ${key} at {parent_path}.{node_name}"
                    )
                node_args[key] = NodeArgValue(ty_name, val)
        sub_nodes: Union[List[SelectNode], None] = None
        if meta.sub_nodes is not None:
            sub_selections = node_selection
            if meta.arg_types is not None:
                if not isinstance(node_selection, tuple):
                    raise Exception(
                        f"node at {parent_path}.{node_name} is a composite "
                        + "requires argument object "
                        + f"but selection is typeof {type(node_selection)}"
                    )
                sub_selections = node_selection[0]
            elif isinstance(sub_selections, tuple):
                raise Exception(
                    f"node at {parent_path}.{node_selection} "
                    + "is a composite that takes no arguments "
                    + f"but selection is typeof {type(node_selection)}",
                )

            if not isinstance(sub_selections, dict):
                raise Exception(
                    f"node at {parent_path}.{node_name} "
                    + "is a no argument composite but first element of "
                    + f"selection is typeof {type(node_selection)}",
                )
            sub_nodes = selection_to_nodes(
                sub_selections, meta.sub_nodes, f"{parent_path}.{node_name}"
            )
        node = SelectNode(node_name, node_args, sub_nodes)
        out.append(node)
    found_nodes.discard("_")
    if len(found_nodes) > 0:
        raise Exception(
            f"unexpected nodes found in selection set at {parent_path}: {found_nodes}",
        )
    return out


def convert_query_node_gql(
    node: SelectNode,
    variables: Dict[str, NodeArgValue],
):
    out = node.name
    if node.args is not None:
        arg_row = ""
        for key, val in node.args.items():
            name = f"in{len(variables)}"
            variables[name] = val
            arg_row += f"{key}: ${name},"
        out += f" ({arg_row})"

    if node.sub_nodes is not None:
        sub_node_list = ""
        for node in node.sub_nodes:
            sub_node_list += f" {convert_query_node_gql(node, variables)}"
        out += f"{{ {sub_node_list} }}"
    return out


@dataclass
class GraphQLTransportOptions:
    headers: Dict[str, str]


@dataclass
class GraphQLRequest:
    addr: str
    method: str
    headers: Dict[str, str]
    body: bytes


@dataclass
class GraphQLResponse:
    req: GraphQLRequest
    status: int
    headers: Dict[str, str]
    body: bytes


class GraphQLTransportBase:
    def __init__(
        self,
        addr: str,
        opts: GraphQLTransportOptions,
        ty_to_gql_ty_map: Dict[str, str],
    ):
        self.addr = addr
        self.opts = opts
        self.ty_to_gql_ty_map = ty_to_gql_ty_map

    def build_gql(
        self,
        query: Dict[str, SelectNode],
        ty: Union[Literal["query"], Literal["mutation"]],
        name: str = "",
    ):
        variables: Dict[str, NodeArgValue] = {}
        root_nodes = ""
        for key, node in query.items():
            root_nodes += f"  {key}: {convert_query_node_gql(node, variables)}\n"
        args_row = ""
        for key, val in variables.items():
            args_row += f"${key}: {self.ty_to_gql_ty_map[val.type_name]},"

        doc = f"{ty} {name}({args_row}) {{\n{root_nodes}}}"
        return (doc, {key: val.value for key, val in variables.items()})

    def build_req(
        self,
        doc: str,
        variables: Dict[str, Any],
        opts: Union[GraphQLTransportOptions, None] = None,
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
            raise Exception(f"unexpected content-type in graphql response", res)
        parsed = json.loads(res.body)
        if parsed["errors"]:
            raise Exception("graphql errors in response", parsed)
        return parsed["data"]


class GraphQLTransportUrlib(GraphQLTransportBase):
    def fetch(
        self,
        doc: str,
        variables: Dict[str, Any],
        opts: Union[GraphQLTransportOptions, None],
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
        inp: Dict[str, QueryNode[Out]],
        opts: Union[GraphQLTransportOptions, None] = None,
    ) -> Dict[str, Out]:
        doc, variables = self.build_gql({key: val for key, val in inp.items()}, "query")
        print(doc, variables)
        out = self.fetch(doc, variables, opts)
        return out

    def mutation(
        self,
        inp: Dict[str, MutationNode[Out]],
        opts: Union[GraphQLTransportOptions, None] = None,
    ) -> Dict[str, Out]:
        doc, variables = self.build_gql(
            {key: val for key, val in inp.items()}, "mutation"
        )
        out = self.fetch(doc, variables, opts)
        return out


# def queryT[Out](
#     self, inp: Tuple[QueryNode[Out, Any, Any], *QueryNode[Out, Any, Any]]
# ) -> Tuple[*Out]:
#     return ()

# def prepare_query[Args, K, Out](
#     self,
#     argType: type[Args],
#     inp: Callable[[Args], Dict[K, SelectNode[Out, Any, Any]]],
# ) -> PreparedRequest[Args, K, Out]:
#     return PreparedRequest(inp)


class PreparedRequest(Generic[ArgT, Out]):
    def __init__(self, inp: Callable[[ArgT], Dict[str, SelectNode[Out]]]):
        self.inp = inp
        pass

    def do(self, args: ArgT) -> Dict[str, Out]:
        return {}


class QueryGraphBase:
    def __init__(self, ty_to_gql_ty_map: Dict[str, str]):
        self.ty_to_gql_ty_map = ty_to_gql_ty_map

    def graphql_sync(
        self, addr: str, opts: Union[GraphQLTransportOptions, None] = None
    ):
        return GraphQLTransportUrlib(
            addr, opts or GraphQLTransportOptions({}), self.ty_to_gql_ty_map
        )


# - - - - - - - - - -- - - - - - -  -- - -  #


class NodeDescs:
    @staticmethod
    def scalar():
        return NodeMeta()

    @staticmethod
    def Post():
        return NodeMeta(
            sub_nodes={
                "slug": NodeDescs.scalar(),
                "title": NodeDescs.scalar(),
            },
        )

    @staticmethod
    def Func9():
        return NodeMeta(
            **{
                **asdict(NodeDescs.Post()),
                **asdict(NodeMeta(
                    arg_types={
                        "filter": "Optional4",
                    },
                ))
            }
        )

    @staticmethod
    def User():
        return NodeMeta(
            sub_nodes={
                "id": NodeDescs.scalar(),
                "email": NodeDescs.scalar(),
                "posts": NodeDescs.Func9(),
            },
        )

    @staticmethod
    def Func19():
        return NodeMeta(
            **{
                **asdict(NodeDescs.Post()),
                **asdict(NodeMeta(
                    arg_types={
                        "id": "String13",
                    },
                ))
            }
        )

    @staticmethod
    def Func20():
        return NodeMeta(
            **asdict(NodeDescs.User()),
        )


class User(TypedDict):
    id: str
    email: str
    post: List["Post"]


class UserArgs(TypedDict):
    id: str


class UserSelectParams(Selection, total=False):
    id: ScalarSelectNoArgs
    email: ScalarSelectNoArgs
    posts: CompositSelectArgs["PostArgs", "PostSelectParams"]


class Post(TypedDict):
    slug: str
    title: str


class PostArgs(TypedDict):
    filter: Union[str, None]


class PostSelectParams(Selection, total=False):
    slug: ScalarSelectNoArgs
    title: ScalarSelectNoArgs


class QueryGraph(QueryGraphBase):
    def __init__(self):
        self.ty_to_gql_ty_map = {
            "String13": "Any",
            "Optional4": "Any",
        }

    def get_user(self, args: UserArgs, select: UserSelectParams):
        node = selection_to_nodes(
            {"getUser": (args, select)}, {"getUser": NodeDescs.Func19()}, "$q"
        )
        return node[0]

    def get_post(self, args: PostArgs, select: PostSelectParams):
        node = selection_to_nodes(
            {"getPosts": (args, select)}, {"getPosts": NodeDescs.Func9()}, "$q"
        )
        return node[0]


qg = QueryGraph()
gql_client = qg.graphql_sync("http://localhost:7890/sample")

out = gql_client.query(
    {
        "user": qg.get_user(
            UserArgs(id="1234"),
            UserSelectParams(
                id=True,
                email=True,
                posts=(PostArgs(filter="top"), PostSelectParams(slug=True, title=True)),
            ),
        ),
        "posts": qg.get_post(
            PostArgs(filter="today"), PostSelectParams(slug=True, title=True)
        ),
    }
)
user = out["user"]

# prepared = gql_client.prepare_query(
#     str,
#     lambda args: {
#         "user": qg.get_user(
#             UserArgs(id="1234"),
#             UserSelectParams(
#                 id=True,
#                 email=True,
#                 posts=(PostArgs(filter="top"), PostSelectParams(slug=True, title=True)),
#             ),
#         ),
#         "posts": qg.get_post(
#             PostArgs(filter="today"), PostSelectParams(slug=True, title=True)
#         ),
#     },
# )
#
# out = prepared.do("arg")
