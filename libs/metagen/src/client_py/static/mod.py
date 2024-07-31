from typing import Any, Callable, Literal, Mapping
from dataclasses import dataclass
import collections.abc as coll_abc

@dataclass
class GraphQLTransportOptions:
    pass

class GraphQLTransport:
    def __init__(self, addr: str, opts: GraphQLTransportOptions):
        self.addr = addr;
        self.opts = opts;

    def prepare_query[Args, K, Out](
        self,
        argType: type[Args],
        inp: Callable[[Args], dict[K, SelectNode[Out, Any, Any]]],
    ) -> PreparedRequest[Args, K, Out]:
        return PreparedRequest(inp)

    def query[K, Out](self, inp: dict[K, SelectNode[Out, Any, Any]]) -> dict[K, Out]:
        return {}

    # def queryT[Out](
    #     self, inp: tuple[QueryNode[Out, Any, Any], *QueryNode[Out, Any, Any]]
    # ) -> tuple[*Out]:
    #     return ()

@dataclass
class NodeArgValue:
    type_name: str
    value: Any

type NodeArgs = dict[str, NodeArgValue];

class SelectNode[Out]:
    def __init__(self, args: NodeArgs, sub_nodes: list['SelectNode']):
        self._phantom: None | Out = None
        self.args = args
        self.sub_nodes = sub_nodes


class PreparedRequest[Args, K, Out]:
    def __init__(self, inp: Callable[[Args], dict[K, SelectNode[Out, Any, Any]]]):
        self.inp = inp
        pass

    def do(self, args: Args) -> dict[K, Out]:
        return {}

class QueryGraphBase:
    def graphql(self, addr: str, opts: GraphQLTransportOptions):
        return GraphQLTransport(addr, opts)

type AliasInfo[SelectT] = dict[str, SelectT];

type ScalarSelectNoArgs = bool | None | AliasInfo['ScalarSelectNoArgs'];
type ScalarSelectArgs[Arg] = tuple[Arg, None] | Literal[False] | None | AliasInfo['ScalarSelectArgs'];
type CompositSelectNoArgs[Selection] = tuple[None, Selection] | Literal[False] | None | AliasInfo['CompositSelectNoArgs'];
type CompositSelectArgs[Arg, Selection] = tuple[Arg, Selection] | Literal[False] | None | AliasInfo['CompositSelectArgs'];

@dataclass
class SelectionFlags:
    select_all: bool | None = None;

@dataclass
class Selection:
    flags: SelectionFlags
    items: Mapping[
        str, 
        ScalarSelectNoArgs 
        | ScalarSelectArgs[Any] 
        | CompositSelectNoArgs[Any] 
        | CompositSelectArgs[Any, Any]
    ]

@dataclass
class NodeMeta:
    sub_nodes: dict[str, 'NodeMeta']
    arg_types: dict[str, str]

def selection_to_nodes(selection: Selection, metas: dict[str, NodeMeta], parent_path: str):
    pass

# - - - - - - - - - -- - - - - - -  -- - -  #

@dataclass
class User:
    id: str
    email: str
    post: list["Post"]

@dataclass
class UserArgs:
    id: str

@dataclass
class UserSelectParams(coll_abc.Mapping):
    id: ScalarSelectNoArgs = None
    email: ScalarSelectNoArgs = None
    posts: CompositSelectArgs["PostArgs", "PostSelectParams"] = None

@dataclass
class Post:
    slug: str
    title: str

@dataclass
class PostArgs:
    filter: str | None


@dataclass
class PostSelectParams:
    slug: ScalarSelectNoArgs = None
    title: ScalarSelectNoArgs = None

class QueryGraph(QueryGraphBase):
    def get_user(self, args: UserArgs, select: UserSelectParams):
        return SelectNode[User, UserArgs, UserSelectParams](args, select)

    def get_post(self, args: PostArgs, select: PostSelectParams):
        return SelectNode[list[Post], PostArgs, PostSelectParams](args, select)


qg = QueryGraph()
gql_client = qg.graphql("0:7890", GraphQLTransportOptions())

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

prepared = gql_client.prepare_query(
    str,
    lambda args: {
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
    },
)

out = prepared.do("arg")
