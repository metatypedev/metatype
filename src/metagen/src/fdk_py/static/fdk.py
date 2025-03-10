import typing

# metagen-genif IGNORE
HostcallBinding = typing.Callable[
    [str, typing.Dict[str, typing.Any]], typing.Dict[str, typing.Any]
]
HostcallTransport = typing.Any
QueryGraph = typing.Any


# metagen-endif
class Ctx:
    # metagen-genif HOSTCALL
    def __init__(
        self, binding: "HostcallBinding", qg: "QueryGraph", host: "HostcallTransport"
    ):
        self.gql = binding
        self.qg = qg
        self.host = host
        pass

    # metagen-endif
    pass
