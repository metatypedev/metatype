from typing import Any, Callable, Literal, TypedDict
from dataclasses import dataclass

@dataclass
class NodeArgValue:
    type_name: str
    value: Any

type NodeArgs = dict[str, NodeArgValue];

@dataclass
class SelectNode[Out]:
    name: str
    args: NodeArgs | None
    sub_nodes: list['SelectNode'] | None
    _phantom: None | Out = None


class PreparedRequest[Args, K, Out]:
    def __init__(self, inp: Callable[[Args], dict[K, SelectNode[Out]]]):
        self.inp = inp
        pass

    def do(self, args: Args) -> dict[K, Out]:
        return {}

class QueryGraphBase:
    def graphql(self, addr: str, opts: GraphQLTransportOptions):
        return GraphQLTransport(addr, opts)

type AliasInfo[SelectT] = dict[str, SelectT];

type ScalarSelectNoArgs = bool | None #| AliasInfo['ScalarSelectNoArgs'];
type ScalarSelectArgs[Arg] = tuple[Arg, None] | Literal[False] | None #| AliasInfo['ScalarSelectArgs'];
type CompositSelectNoArgs[Selection] = tuple[None, Selection] | Literal[False] | None #| AliasInfo['CompositSelectNoArgs'];
type CompositSelectArgs[Arg, Selection] = tuple[Arg, Selection] | Literal[False] | None #| AliasInfo['CompositSelectArgs'];

@dataclass
class SelectionFlags:
    select_all: bool | None = None;

class Selection(TypedDict, total=False):
    _: SelectionFlags

type SelectionGeneric = dict[
    str, 
    SelectionFlags
    | ScalarSelectNoArgs
    | ScalarSelectArgs[dict[str, Any]]
    | CompositSelectNoArgs
    | CompositSelectArgs[dict[str, Any], Any]
];

@dataclass
class NodeMeta:
    sub_nodes: dict[str, 'NodeMeta'] | None = None
    arg_types: dict[str, str] | None = None

def selection_to_nodes(selection: SelectionGeneric, metas: dict[str, NodeMeta], parent_path: str) -> list[SelectNode[Any]]:
    out = []
    flags = selection["_"];
    if flags is not None and not isinstance(flags, SelectionFlags):
        raise Exception(f"selection field '_' should be of type SelectionFlags but found {type(flags)}")
    select_all = True if flags is not None and flags.select_all else False;
    found_nodes = set(selection.keys())
    for node_name, meta in metas.items():
        found_nodes.remove(node_name)

        node_selection = selection[node_name]
        if (
            node_selection is None and not select_all
        ) or (
            node_selection == False
        ):
            # this node was not selected
            continue

        node_args: NodeArgs | None = None
        if meta.arg_types is not None:
            if not isinstance(node_selection, tuple):
                raise Exception(
                    f"node at {parent_path}.{node_name} is a scalar that "+
                        "requires arguments " 
                        + f"but selection is typeof {type(node_selection)}"
                )
            arg = node_selection[0];
            if not isinstance(arg, dict):
                raise Exception(
                    f"node at {parent_path}.{node_name} is a scalar that "
                        + "requires argument object " 
                        + f"but first element of selection is typeof {type(node_selection)}"
                )

            expected_args = { key: val for key,val in meta.arg_types.items() }
            node_args = {}
            for key, val in arg.items():
                ty_name = expected_args.pop(key)
                if ty_name is None:
                    raise Exception(
                        f"unexpected argument ${key} at {parent_path}.{node_name}"
                    );
                node_args[key] = NodeArgValue(ty_name, val)
        sub_nodes: list[SelectNode] | None = None
        if meta.sub_nodes is not None:
            sub_selections = node_selection
            if meta.arg_types is not None:
                if not isinstance(node_selection, tuple):
                    raise Exception(
                        f"node at {parent_path}.{node_name} is a composite "
                            +"requires argument object " 
                            + f"but selection is typeof {type(node_selection)}"
                    )
                sub_selections = node_selection[0]
            elif isinstance(sub_selections, tuple):
                raise Exception(
                  f"node at {parent_path}.{node_selection} " +
                  "is a composite that takes no arguments " +
                  f"but selection is typeof {type(node_selection)}",
                );

            if not isinstance(sub_selections, dict):
                raise Exception(
                  f"node at {parent_path}.{node_name} " +
                  "is a no argument composite but first element of " +
                  f"selection is typeof {type(node_selection)}",
                );
            sub_nodes = selection_to_nodes(
                sub_selections, 
                meta.sub_nodes, 
                f"{parent_path}.{node_name}"
            )
        out.append(SelectNode(node_name, node_args, sub_nodes))
    found_nodes.remove('_')
    if len(found_nodes) > 0:
        raise Exception(
          f"unexpected nodes found in selection set at {parent_path}: {found_nodes}",
        );
    return out

def convert_query_node_gql(node: SelectNode, variables: dict[str, NodeArgValue],):
  out = node.name;

  if node.args is not None:
    arg_row = ""
    for key, val in node.args.items():
        name = f"in{len(variables)}";
        variables[name] = val;
        arg_row += f"{key}: ${name},";
    out += f" ({arg_row})";

  if node.sub_nodes is not None:
    sub_node_list = ""
    for node in node.sub_nodes:
        sub_node_list += f" {convert_query_node_gql(node, variables)}"
    out += f"{{ {sub_node_list} }}";
  return out;

@dataclass
class GraphQLTransportOptions:
    pass

class GraphQLTransport:
    def __init__(
        self, 
        addr: str, 
        opts: GraphQLTransportOptions,
        ty_to_gql_ty_map: dict[str, str],
    ):
        self.addr = addr;
        self.opts = opts;
        self.ty_to_gql_ty_map = ty_to_gql_ty_map

    def buildGql(
        self,
        query: dict[str, SelectNode],
        ty: Literal["query"] | Literal["mutation"],
        name: str = "",
    ):
        variables: dict[str, NodeArgValue] = {}
        root_nodes = "";
        for key, node in query.items():
            root_nodes += f"{key}: {convert_query_node_gql(node, variables)}\n" 
        args_row = ""
        for key, val in variables.items():
            args_row += f"${key}: {self.ty_to_gql_ty_map[val.type_name]}"

        doc = f"{ty} {name}({args_row}) {{
          {root_nodes}}}";

        return (
            doc,
            { key: val.value for key, val in variables.items() }
        );

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

# - - - - - - - - - -- - - - - - -  -- - -  #

class User(TypedDict):
    id: str
    email: str
    post: list["Post"]

class UserArgs(TypedDict):
    id: str

class UserSelectParams(Selection, total=False):
    id: ScalarSelectNoArgs
    email: ScalarSelectNoArgs
    posts: CompositSelectArgs["PostArgs", "PostSelectParams"]

@dataclass
class Post:
    slug: str
    title: str

@dataclass
class PostArgs:
    filter: str | None


class PostSelectParams(Selection, total=False):
    slug: ScalarSelectNoArgs
    title: ScalarSelectNoArgs

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
