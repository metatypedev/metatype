import typing

# metagen-genif IGNORE
# these will be avail from client.py if hostcall is set
# but are not used otherwise
HostcallTransport = typing.Any
QueryGraph = typing.Any
# metagen-endif
# metagen-genif-not HOSTCALL
HostcallBinding = typing.Callable[
    [str, typing.Dict[str, typing.Any]], typing.Dict[str, typing.Any]
]


# metagen-endif
class Ctx:
    def __init__(
        self,
        binding: "HostcallBinding",
        # metagen-genif HOSTCALL
        qg: "QueryGraph",
        host: "HostcallTransport",
        # metagen-endif
    ):
        self.__binding = binding
        # metagen-genif HOSTCALL
        self.qg = qg
        self.host = host
        # metagen-endif

    def gql(self, query: str, variables: typing.Mapping):
        return self.__binding(query, dict(variables))
