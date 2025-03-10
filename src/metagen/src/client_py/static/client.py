# metagen-endif
import dataclasses as dc
import http.client as http_c
import io
import json
import mimetypes
import re

# metagen-genif-not HOSTCALL
# metagen-skip
# the following import is expected from the fdk.py
import typing
import urllib
import urllib.error
import urllib.request as request
import uuid
from abc import ABC, abstractmethod


def selection_to_nodes(
    selection: "SelectionErased",
    metas: typing.Dict[str, "NodeMetaFn"],
    parent_path: str,
) -> typing.List["SelectNode[typing.Any]"]:
    out = []
    sub_flags = selection.get("_")
    if sub_flags is not None and not isinstance(sub_flags, SelectionFlags):
        raise Exception(
            f"selection field '_' should be of type SelectionFlags but found {type(sub_flags)}"
        )
    select_all = bool(sub_flags and sub_flags.select_all)
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
                    f"nested Alias node discovered at {parent_path}.{instance_name}"
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

            sub_nodes: SubNodes = None
            if meta.sub_nodes is not None or meta.variants is not None:
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

                # we got a tuple selection when this shouldn't be the case
                elif isinstance(sub_selections, tuple):
                    raise Exception(
                        f"node at {parent_path}.{instance_name} "
                        + "is a composite that takes no arguments "
                        + f"but selection is typeof {type(instance_selection)}",
                    )

                # flags are recursive for any subnode that's not specified
                if sub_selections is None:
                    sub_selections = {"_": sub_flags}

                # selection types are always TypedDicts as well
                if not isinstance(sub_selections, dict):
                    raise Exception(
                        f"node at {parent_path}.{instance_name} "
                        + "is a no argument composite but first element of "
                        + f"selection is typeof {type(instance_selection)}",
                    )

                if meta.sub_nodes is not None:
                    if meta.variants is not None:
                        raise Exception(
                            "unreachable: union/either NodeMetas can't have subnodes"
                        )

                    # skip non explicit composite selection when using select_all
                    sub_flags = sub_selections.get("_")

                    if (
                        isinstance(sub_flags, SelectionFlags)
                        and sub_flags.select_all
                        and instance_selection is None
                    ):
                        continue

                    sub_nodes = selection_to_nodes(
                        typing.cast("SelectionErased", sub_selections),
                        meta.sub_nodes,
                        f"{parent_path}.{instance_name}",
                    )
                else:
                    assert meta.variants is not None
                    union_selections: typing.Dict[str, typing.List[SelectNode]] = {}
                    for variant_ty, variant_meta in meta.variants.items():
                        variant_meta = variant_meta()

                        # this union member is a scalar
                        if variant_meta.sub_nodes is None:
                            continue

                        variant_select = sub_selections.pop(variant_ty, None)
                        nodes = (
                            selection_to_nodes(
                                typing.cast("SelectionErased", variant_select),
                                variant_meta.sub_nodes,
                                f"{parent_path}.{instance_name}.variant({variant_ty})",
                            )
                            if variant_select is not None
                            else []
                        )

                        # we select __typename for each variant
                        # even if the user is not interested in the variant
                        nodes.append(
                            SelectNode(
                                node_name="__typename",
                                instance_name="__typename",
                                args=None,
                                sub_nodes=None,
                                files=None,
                            )
                        )

                        union_selections[variant_ty] = nodes

                    if len(sub_selections) > 0:
                        raise Exception(
                            f"node at {parent_path}.{instance_name} "
                            + "has none of the variants called "
                            + str(sub_selections.keys()),
                        )
                    sub_nodes = union_selections

            node = SelectNode(
                node_name, instance_name, instance_args, sub_nodes, meta.input_files
            )
            out.append(node)

    found_nodes.discard("_")
    if len(found_nodes) > 0:
        raise Exception(
            f"unexpected nodes found in selection set at {parent_path}: {found_nodes}",
        )
    return out


#
# --- --- Util types --- --- #
#

Out = typing.TypeVar("Out", covariant=True)
PreparedOut = typing.TypeVar("PreparedOut", covariant=True)

T = typing.TypeVar("T")

ArgT = typing.TypeVar("ArgT", bound=typing.Mapping[str, typing.Any])
SelectionT = typing.TypeVar("SelectionT")


class File:
    def __init__(
        self, content: bytes, name: str, mimetype: typing.Optional[str] = None
    ):
        self.content = content
        self.name = name
        self.mimetype = mimetype


#
# --- --- Graph node types --- --- #
#


SubNodes = typing.Union[
    None,
    # atomic composite
    typing.List["SelectNode"],
    # union/either selection
    typing.Dict[str, typing.List["SelectNode"]],
]

TypePath = typing.List[typing.Union[typing.Literal["?"], typing.Literal["[]"], str]]
ValuePath = typing.List[typing.Union[typing.Literal[""], str]]


@dc.dataclass
class SelectNode(typing.Generic[Out]):
    node_name: str
    instance_name: str
    args: typing.Optional["NodeArgs"]
    sub_nodes: SubNodes
    files: typing.Optional[typing.List[TypePath]]


@dc.dataclass
class QueryNode(SelectNode[Out]):
    pass


@dc.dataclass
class MutationNode(SelectNode[Out]):
    pass


NodeMetaFn = typing.Callable[[], "NodeMeta"]


@dc.dataclass
class NodeMeta:
    sub_nodes: typing.Optional[typing.Dict[str, NodeMetaFn]] = None
    variants: typing.Optional[typing.Dict[str, NodeMetaFn]] = None
    arg_types: typing.Optional[typing.Dict[str, str]] = None
    input_files: typing.Optional[typing.List[TypePath]] = None


class FileExtractor:
    def __init__(self):
        self.path: TypePath = []
        self.current_path: ValuePath = []
        self.result: typing.Dict[str, File] = {}

    def extract_from_value(self, value: typing.Any):
        next_segment = self.path[len(self.current_path)]

        if next_segment == "?":
            if value is None:
                return
            self.current_path.append("")
            self.extract_from_value(value)
            self.current_path.pop()
            return

        if next_segment == "[]":
            if not isinstance(value, list):
                raise Exception(f"Expected array at {self.format_path()}")

            for idx in range(len(value)):
                self.current_path.append(f"[{idx}]")
                self.extract_from_array(value, idx)
                self.current_path.pop()
            return

        if next_segment.startswith("."):
            if not isinstance(value, dict):
                raise Exception(f"Expected dictionary at {self.format_path()}")

            self.current_path.append(next_segment)
            self.extract_from_object(value, next_segment[1:])
            self.current_path.pop()
            return

    def extract_from_array(self, parent: typing.List[typing.Any], idx: int):
        value = parent[idx]

        if len(self.current_path) == len(self.path):
            if isinstance(value, File):
                self.result[self.format_path()] = value
                parent[idx] = None
                return

            raise Exception(f"Expected File at {self.format_path()}")

        self.extract_from_value(value)

    def extract_from_object(self, parent: typing.Dict[str, typing.Any], key: str):
        value = parent.get(key)

        if len(self.current_path) == len(self.path):
            if isinstance(value, File):
                self.result[self.format_path()] = value
                parent[key] = None
                return

            raise Exception(f"Expected File at {self.format_path()}")

        self.extract_from_value(value)

    def format_path(self):
        res = ""

        for path in self.current_path:
            res += f".{path[1:-1]}" if path.startswith("[") else path

        return res


def extract_files(
    key: str, obj: typing.Dict[str, typing.Any], paths: typing.List[TypePath]
):
    extractor = FileExtractor()

    for path in paths:
        if path[0] and path[0].startswith("." + key):
            extractor.current_path = []
            extractor.path = path
            extractor.extract_from_value(obj)

    return extractor.result


#
# --- --- Argument types --- --- #
#


@dc.dataclass
class NodeArgValue:
    type_name: str
    value: typing.Any


NodeArgs = typing.Dict[str, NodeArgValue]


class PlaceholderValue(typing.Generic[T]):
    def __init__(self, key: str):
        self.key = key


PlaceholderArgs = typing.Dict[str, PlaceholderValue]


class PreparedArgs:
    def get(self, key: str) -> PlaceholderValue:
        return PlaceholderValue(key)


#
# --- --- Selection types --- --- #
#


class Alias(typing.Generic[SelectionT]):
    """
    Request multiple instances of a single node under different
    aliases.
    """

    def __init__(self, **aliases: SelectionT):
        self.items = aliases


ScalarSelectNoArgs = typing.Union[bool, Alias[typing.Literal[True]], None]
ScalarSelectArgs = typing.Union[
    ArgT,
    PlaceholderArgs,
    Alias[typing.Union[ArgT, PlaceholderArgs]],
    typing.Literal[False],
    None,
]
CompositeSelectNoArgs = typing.Union[
    SelectionT, Alias[SelectionT], typing.Literal[False], None
]
CompositeSelectArgs = typing.Union[
    typing.Tuple[typing.Union[ArgT, PlaceholderArgs], SelectionT],
    Alias[typing.Tuple[typing.Union[ArgT, PlaceholderArgs], SelectionT]],
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


SelectionErased = typing.Mapping[
    str,
    typing.Union[
        SelectionFlags,
        ScalarSelectNoArgs,
        ScalarSelectArgs[typing.Mapping[str, typing.Any]],
        CompositeSelectNoArgs["SelectionErased"],
        # FIXME: should be possible to make SelectionT here `SelectionErased` recursively
        # but something breaks
        CompositeSelectArgs[typing.Mapping[str, typing.Any], typing.Any],
    ],
]

#
# --- --- GraphQL types --- --- #
#


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


def convert_query_node_gql(
    ty_to_gql_ty_map: typing.Dict[str, str],
    node: SelectNode,
    variables: typing.Dict[str, NodeArgValue],
    files: typing.Dict[str, File],
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
            obj = {key: val.value}

            if node.files is not None and len(node.files) > 0:
                extracted_files = extract_files(key, obj, node.files)

                for path, file in extracted_files.items():
                    path_in_variables = re.sub(r"^\.[^.\[]+", f".{name}", path)
                    files[path_in_variables] = file

            val.value = obj[key]
            variables[name] = val
            arg_row += f"{key}: ${name}, "
        if len(arg_row):
            out += f"({arg_row[:-2]})"

    # if it's a dict, it'll be a union selection
    if isinstance(node.sub_nodes, dict):
        sub_node_list = ""
        for variant_ty, sub_nodes in node.sub_nodes.items():
            # fetch the gql variant name so we can do
            # type assertions
            gql_ty = ty_to_gql_ty_map[variant_ty]
            if gql_ty is None:
                raise Exception(
                    f"unreachable: no graphql type found for variant {variant_ty}"
                )
            gql_ty = gql_ty.strip("!")

            sub_node_list += f"... on {gql_ty} {{ "
            for node in sub_nodes:
                sub_node_list += f"{convert_query_node_gql(ty_to_gql_ty_map, node, variables, files)} "
            sub_node_list += "}"
        out += f" {{ {sub_node_list}}}"
    elif isinstance(node.sub_nodes, list):
        sub_node_list = ""
        for sub_node in node.sub_nodes:
            sub_node_list += f"{convert_query_node_gql(ty_to_gql_ty_map, sub_node, variables, files)} "
        out += f" {{ {sub_node_list}}}"
    return out


class MultiPartForm:
    def __init__(self):
        self.form_fields: typing.List[typing.Tuple[str, str]] = []
        self.files: typing.List[typing.Tuple[str, File]] = []
        self.boundary = uuid.uuid4().hex.encode("utf-8")

    def add_field(self, name: str, value: str):
        self.form_fields.append((name, value))

    def add_file(self, key, file: File):
        self.files.append((key, file))

    def get_content_type(self):
        return f"multipart/form-data; boundary={self.boundary.decode('utf-8')}"

    def _form_data(self, name):
        return f'Content-Disposition: form-data; name="{name}"\r\n'.encode("utf-8")

    def _attached_file(self, name, filename):
        return f'Content-Disposition: file; name="{name}"; filename="{filename}"\r\n'.encode(
            "utf-8"
        )

    def _content_type(self, ct):
        return f"Content-Type: {ct}\r\n".encode("utf-8")

    def __bytes__(self):
        buffer = io.BytesIO()
        boundary = b"--" + self.boundary + b"\r\n"

        for name, value in self.form_fields:
            buffer.write(boundary)
            buffer.write(self._form_data(name))
            buffer.write(b"\r\n")
            buffer.write(value.encode("utf-8"))
            buffer.write(b"\r\n")

        for key, file in self.files:
            mimetype = (
                file.mimetype
                or mimetypes.guess_type(file.name)[0]
                or "application/octet-stream"
            )

            buffer.write(boundary)
            buffer.write(self._attached_file(key, file.name))
            buffer.write(self._content_type(mimetype))
            buffer.write(b"\r\n")
            buffer.write(file.content)
            buffer.write(b"\r\n")

        buffer.write(b"--" + self.boundary + b"--\r\n")

        return buffer.getvalue()


class GraphQLTransportBase(ABC):
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
        query: typing.Mapping[str, SelectNode],
        ty: typing.Union[typing.Literal["query"], typing.Literal["mutation"]],
        name: str = "",
    ):
        variables: typing.Dict[str, NodeArgValue] = {}
        files: typing.Dict[str, File] = {}
        root_nodes = ""
        for key, node in query.items():
            fixed_node = SelectNode(
                node.node_name, key, node.args, node.sub_nodes, node.files
            )
            root_nodes += f"  {convert_query_node_gql(self.ty_to_gql_ty_map, fixed_node, variables, files)}\n"
        args_row = ""
        for key, val in variables.items():
            args_row += f"${key}: {self.ty_to_gql_ty_map[val.type_name]}, "

        if len(args_row):
            args_row = f"({args_row[:-2]})"

        doc = f"{ty} {name}{args_row} {{\n{root_nodes}}}"
        variables = {key: val.value for key, val in variables.items()}
        # print(doc, variables)
        return (doc, variables, files)

    def build_req(
        self,
        doc: str,
        variables: typing.Dict[str, typing.Any],
        opts: typing.Optional[GraphQLTransportOptions] = None,
        files: typing.Optional[typing.Dict[str, File]] = None,
    ):
        if files is None:
            files = {}
        headers = {}
        headers.update(self.opts.headers)
        if opts:
            headers.update(opts.headers)
        headers.update({"accept": "application/json"})

        body = json.dumps({"query": doc, "variables": variables})

        if len(files) > 0:
            form_data = MultiPartForm()
            form_data.add_field("operations", body)
            file_map = {}
            map = {}

            for path, file in files.items():
                array = file_map.get(file)
                variable = "variables" + path
                if array is not None:
                    array.append(variable)
                else:
                    file_map[file] = [variable]

            for idx, (file, variables) in enumerate(file_map.items()):
                key = str(idx)
                map[key] = variables
                form_data.add_file(key, file)

            form_data.add_field("map", json.dumps(map))
            headers.update({"Content-type": form_data.get_content_type()})
            body = bytes(form_data)
        else:
            headers.update({"Content-type": "application/json"})
            body = body.encode("utf-8")

        return GraphQLRequest(
            addr=self.addr,
            method="POST",
            headers=headers,
            body=body,
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

    @abstractmethod
    def fetch(
        self,
        doc: str,
        variables: typing.Dict[str, typing.Any],
        opts: GraphQLTransportOptions | None,
        files: typing.Optional[typing.Dict[str, File]] = None,
    ) -> typing.Any: ...

    @typing.overload
    def query(
        self,
        inp: QueryNode[Out],
        opts: typing.Optional[GraphQLTransportOptions] = None,
        name: str = "",
    ) -> Out: ...

    @typing.overload
    def query(
        self,
        inp: typing.Dict[str, QueryNode[Out]],
        opts: typing.Optional[GraphQLTransportOptions] = None,
        name: str = "",
    ) -> typing.Dict[str, Out]: ...

    def query(
        self,
        inp: typing.Union[QueryNode[Out], typing.Dict[str, QueryNode[Out]]],
        opts: typing.Optional[GraphQLTransportOptions] = None,
        name: str = "",
    ) -> typing.Union[Out, typing.Dict[str, Out]]:
        query = {"value": inp} if isinstance(inp, QueryNode) else inp
        doc, variables, _ = self.build_gql(query, "query", name)
        result = self.fetch(doc, variables, opts)
        return result["value"] if isinstance(inp, QueryNode) else result

    @typing.overload
    def mutation(
        self,
        inp: MutationNode[Out],
        opts: typing.Optional[GraphQLTransportOptions] = None,
        name: str = "",
    ) -> Out: ...

    @typing.overload
    def mutation(
        self,
        inp: typing.Dict[str, MutationNode[Out]],
        opts: typing.Optional[GraphQLTransportOptions] = None,
        name: str = "",
    ) -> typing.Dict[str, Out]: ...

    def mutation(
        self,
        inp: typing.Union[MutationNode[Out], typing.Dict[str, MutationNode[Out]]],
        opts: typing.Optional[GraphQLTransportOptions] = None,
        name: str = "",
    ) -> typing.Union[Out, typing.Dict[str, Out]]:
        mutation = {"value": inp} if isinstance(inp, MutationNode) else inp
        doc, variables, files = self.build_gql(mutation, "mutation", name)
        result = self.fetch(doc, variables, opts, files)
        return result["value"] if isinstance(inp, MutationNode) else result


class GraphQLTransportUrlib(GraphQLTransportBase):
    def fetch(
        self,
        doc: str,
        variables: typing.Dict[str, typing.Any],
        opts: typing.Optional[GraphQLTransportOptions],
        files: typing.Optional[typing.Dict[str, File]] = None,
    ):
        if files is None:
            files = {}
        req = self.build_req(doc, variables, opts, files)
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
            raise Exception(f"URL error: {err.reason}") from err

    @typing.overload
    def prepare_query(
        self,
        fun: typing.Callable[[PreparedArgs], QueryNode[Out]],
        name: str = "",
    ) -> "PreparedRequest[Out, Out]": ...

    @typing.overload
    def prepare_query(
        self,
        fun: typing.Callable[[PreparedArgs], typing.Dict[str, QueryNode[Out]]],
        name: str = "",
    ) -> "PreparedRequest[Out, typing.Dict[str, Out]]": ...

    def prepare_query(
        self,
        fun: typing.Callable[
            [PreparedArgs],
            typing.Union[QueryNode[Out], typing.Dict[str, QueryNode[Out]]],
        ],
        name: str = "",
    ) -> typing.Union[
        "PreparedRequest[Out, Out]",
        "PreparedRequest[Out, typing.Dict[str, Out]]",
    ]:
        return PreparedRequest(self, fun, "query", name)

    @typing.overload
    def prepare_mutation(
        self,
        fun: typing.Callable[[PreparedArgs], MutationNode[Out]],
        name: str = "",
    ) -> "PreparedRequest[Out, Out]": ...

    @typing.overload
    def prepare_mutation(
        self,
        fun: typing.Callable[[PreparedArgs], typing.Dict[str, MutationNode[Out]]],
        name: str = "",
    ) -> "PreparedRequest[Out, typing.Dict[str, Out]]": ...

    def prepare_mutation(
        self,
        fun: typing.Callable[
            [PreparedArgs],
            typing.Union[MutationNode[Out], typing.Dict[str, MutationNode[Out]]],
        ],
        name: str = "",
    ) -> typing.Union[
        "PreparedRequest[Out, Out]",
        "PreparedRequest[Out, typing.Dict[str, Out]]",
    ]:
        return PreparedRequest(self, fun, "mutation", name)


# metagen-genif HOSTCALL

HostcallBinding = typing.Callable[
    [str, typing.Dict[str, typing.Any]], typing.Dict[str, typing.Any]
]


class HostcallTransport(GraphQLTransportBase):
    def __init__(
        self,
        gql_fn: HostcallBinding,
        opts: GraphQLTransportOptions,
        ty_to_gql_ty_map: typing.Dict[str, str],
    ):
        self.gql_fn = gql_fn
        self.opts = opts
        self.ty_to_gql_ty_map = ty_to_gql_ty_map

    def fetch(
        self,
        doc: str,
        variables: typing.Dict[str, typing.Any],
        opts: typing.Optional[GraphQLTransportOptions],
        files: typing.Optional[typing.Dict[str, File]] = None,
    ):
        _ = opts

        if files is None:
            files = {}

        if len(files) > 0:
            raise Exception("no support for file upload on HostcallTransport")

        res = self.gql_fn(doc, variables)
        if res.get("errors"):
            raise Exception("graphql errors in response", res)
        return res["data"]

    @typing.overload
    def prepare_query(
        self,
        fun: typing.Callable[[PreparedArgs], QueryNode[Out]],
        name: str = "",
    ) -> "PreparedRequest[Out, Out]": ...

    @typing.overload
    def prepare_query(
        self,
        fun: typing.Callable[[PreparedArgs], typing.Dict[str, QueryNode[Out]]],
        name: str = "",
    ) -> "PreparedRequest[Out, typing.Dict[str, Out]]": ...

    def prepare_query(
        self,
        fun: typing.Callable[
            [PreparedArgs],
            typing.Union[QueryNode[Out], typing.Dict[str, QueryNode[Out]]],
        ],
        name: str = "",
    ) -> typing.Union[
        "PreparedRequest[Out, Out]",
        "PreparedRequest[Out, typing.Dict[str, Out]]",
    ]:
        return PreparedRequest(self, fun, "query", name)

    @typing.overload
    def prepare_mutation(
        self,
        fun: typing.Callable[[PreparedArgs], MutationNode[Out]],
        name: str = "",
    ) -> "PreparedRequest[Out, Out]": ...

    @typing.overload
    def prepare_mutation(
        self,
        fun: typing.Callable[[PreparedArgs], typing.Dict[str, MutationNode[Out]]],
        name: str = "",
    ) -> "PreparedRequest[Out, typing.Dict[str, Out]]": ...

    def prepare_mutation(
        self,
        fun: typing.Callable[
            [PreparedArgs],
            typing.Union[MutationNode[Out], typing.Dict[str, MutationNode[Out]]],
        ],
        name: str = "",
    ) -> typing.Union[
        "PreparedRequest[Out, Out]",
        "PreparedRequest[Out, typing.Dict[str, Out]]",
    ]:
        return PreparedRequest(self, fun, "mutation", name)


# metagen-endif


class PreparedRequest(typing.Generic[Out, PreparedOut]):
    def __init__(
        self,
        transport: GraphQLTransportBase,
        fun: typing.Callable[
            [PreparedArgs],
            typing.Union[SelectNode[Out], typing.Mapping[str, SelectNode[Out]]],
        ],
        ty: typing.Union[typing.Literal["query"], typing.Literal["mutation"]],
        name: str = "",
    ):
        dry_run_node = fun(PreparedArgs())
        query = (
            {"value": dry_run_node}
            if isinstance(dry_run_node, SelectNode)
            else dry_run_node
        )
        doc, variables, files = transport.build_gql(query, ty, name)
        self.single_node = isinstance(dry_run_node, SelectNode)
        self.doc = doc
        self._mapping = variables
        self.transport = transport
        self.files = files

    def resolve_vars(
        self,
        args: typing.Mapping[str, typing.Any],
        mappings: typing.Dict[str, typing.Any],
    ):
        resolved: typing.Dict[str, typing.Any] = {}
        for key, val in mappings.items():
            if isinstance(val, PlaceholderValue):
                resolved[key] = args[val.key]
            elif isinstance(val, dict):
                self.resolve_vars(args, val)
            else:
                resolved[key] = val
        return resolved

    def perform(
        self,
        args: typing.Mapping[str, typing.Any],
        opts: typing.Optional[GraphQLTransportOptions] = None,
    ) -> PreparedOut:
        resolved_vars = self.resolve_vars(args, self._mapping)
        result = self.transport.fetch(self.doc, resolved_vars, opts)
        if self.single_node:
            return result["value"]
        else:
            return result


#
# --- --- QueryGraph types --- --- #
#


class QueryGraphBase:
    def __init__(self, ty_to_gql_ty_map: typing.Dict[str, str]):
        self.ty_to_gql_ty_map = ty_to_gql_ty_map


class Transports:
    @staticmethod
    def graphql_sync(
        qg: QueryGraphBase,
        addr: str,
        opts: typing.Optional[GraphQLTransportOptions] = None,
    ):
        return GraphQLTransportUrlib(
            addr, opts or GraphQLTransportOptions({}), qg.ty_to_gql_ty_map
        )

    # metagen-genif HOSTCALL

    @staticmethod
    def hostcall(
        qg: QueryGraphBase,
        binding: HostcallBinding,
    ):
        return HostcallTransport(
            binding, GraphQLTransportOptions({}), qg.ty_to_gql_ty_map
        )

    # metagen-endif


#
# --- --- Typegraph types --- --- #
#
