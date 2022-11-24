# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import functools
from textwrap import indent
from typing import Dict
from typing import List
from typing import Optional
from typing import Tuple
from typing import Union

from frozendict import frozendict
import orjson
from typegraph.graphs.typegraph import NodeProxy
from typegraph.graphs.typegraph import TypegraphContext
from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
from typegraph.materializers.deno import IdentityMat

# proper type : type : int
# first order type : type => type : List[int] ~ type constructor that takes a proper type
# first order type : type => (type => type)
# higher-order type : (type => type) => type : Functor[List[Int]] ~ type constructors that parametrize over type constructors.

# a type is
# - materialized through a function
# - contained inside another type
# - reference another materialization/type


# hierarchy
# paramétré
# secret
# sensitive
# transaction


def encode(obj):
    if isinstance(obj, dict):
        return frozendict({k: encode(v) for k, v in obj.items()})
    return obj


class Type:
    alias_name: str = None
    type_name: str = None
    _runtime: Optional[Runtime] = None

    _id: bool = False

    # input field
    default_value: Optional[any] = None
    inject: Optional[Union[str, "Type"]] = None
    injection: Optional[str] = None

    type_id: int

    policies: List["policy"]

    # random generation params for chancejs: (function name, arg)
    rg_params: Optional[Tuple[str, Dict]] = None

    def __init__(self) -> None:
        super().__init__()
        self.policies = []
        self.graph = TypegraphContext.get_active()
        if self.graph:
            self.graph.register(self)
            self.type_id = self.graph.next_type_id()
        else:
            raise Exception("no typegraph context")

    def named(self, name: str) -> "Type":
        # TODO : only if same name and different implementation
        # if any(tpe.alias_name == name for tpe in self.graph.types):
        #    raise Exception(f'type alias "{name}" already exists')

        self.alias_name = name
        return self

    def is_typedef(self, typedef) -> bool:
        return type(self) is typedef

    def is_named(self) -> bool:
        return self.alias_name is not None

    @property
    def typedef(self) -> str:
        return type(self).__name__

    @property
    def node(self) -> str:
        if getattr(self, "alias_name", False):
            return self.alias_name

        return f"{self.type_name}_{self.type_id}"

    @property
    def edges(self) -> List["Type"]:
        return []

    @property
    def runtime(self):
        return self._runtime

    @runtime.setter
    def runtime(self, value):
        if value is None:
            raise Exception(f"cannot set runtime to None")

        if self._runtime is not None and value != self._runtime:
            raise Exception(
                f"trying to set a different runtime {value}, already is {self._runtime}"
            )

        self._runtime = value

    def propagate_runtime(self, runtime: Runtime, visited=None):
        if visited is None:
            visited = set()
        elif self in visited:
            return
        else:
            visited.add(self)

        if self.runtime is None:
            self.runtime = runtime

        for e in self.edges:
            e.propagate_runtime(self.runtime, visited)

    @property
    def data(self) -> dict:
        ret = {}
        if self.default_value is not None:
            ret["default_value"] = encode(self.default_value)
        if self.inject is not None:
            ret["inject"] = self.inject
            ret["injection"] = self.injection
        return ret

    def __str__(self) -> str:
        return self.typedef

    # sugar

    def s_refine(self, predicat):
        # emit a new type with give condition
        return self

    def s_raw(self, value):
        if self.inject is not None:
            raise Exception(f"{self.node} can only have one injection")

        self.inject = orjson.dumps(value).decode()
        self.injection = "raw"
        return self

    def s_secret(self, secret_name):
        if self.inject is not None:
            raise Exception(f"{self.node} can only have one injection")

        self.inject = secret_name
        self.injection = "secret"
        return self

    def s_parent(self, sibiling: NodeProxy):
        # TODO: check for same type and value in same context
        if self.inject is not None:
            raise Exception(f"{self.node} can only have one injection")

        self.inject = sibiling
        self.injection = "parent"
        return self

    def s_context(self, claim: str):
        if self.inject is not None:
            raise Exception(f"{self.node} can only have one injection")

        self.inject = claim
        self.injection = "context"
        return self

    # props

    def add_policy(
        self,
        *policies: "policy",
        # hide or mask or generate dummy
    ):
        # does not change type
        self.policies.extend(policies)
        return self

    def within(self, runtime):
        self.runtime = runtime
        return self

    @property
    def id(self):
        self._id = True
        return self

    def s_optional(self, value=None):
        tpe = self
        if not isinstance(tpe, optional):
            with self.graph:
                tpe = optional(tpe)

        tpe.default_value = value
        return tpe

    def random(self, tpe: str, **kwargs):
        self.rg_params = (tpe, dict(kwargs))
        return self


# default value or seq (auto increment)
# generated columns
# constraint : bool, null, unique
# primary key (multiple)
# foreign key (multiple) - on delete, update
# comment
# row level security


class literal(Type):
    value: any

    def __init__(self, value) -> None:
        super().__init__()
        self.value = value

    @property
    def type_name(self) -> str:
        return f"literal_{self.value}"


# any
# =
# hash
# type

# comparable
# <

# numeric = comparable

# bit 1

# boxed vs unboxed

# bytes 8
# short 16
# long 64
# double 64

# int = numeric


class integer(Type):
    type_name = "integer"
    _auto: bool = False

    @property
    def auto(self):
        self._auto = True
        return self


class unsigned_integer(Type):
    type_name = "unsigned_integer"
    _auto: bool = False

    @property
    def auto(self):
        self._auto = True
        return self


# unsigned int = int | x > 0 or numeric

# float = numeric


class float(Type):
    type_name = "float"


# char = int


class char(Type):
    type_name = "char"


# bool =


class boolean(Type):
    type_name = "boolean"


# optional = countable


class optional(Type):
    of: Type

    def __init__(self, of) -> None:
        super().__init__()
        self.of = of

    @property
    def type_name(self) -> str:
        return f"optional_{self.of.node}"

    @property
    def edges(self) -> List[Type]:
        return [self.of]


# datetime = comparable


class datetime(Type):
    type_name = "datetime"


class date(datetime):
    type_name = "date"


# iterable ( x )
# map

# order-able ( x < iterable )
# - sort

# countable ( x < iterable )
# - count
# - empty


# list = iterable(x) + countable + order-able


class list(Type):
    ordered = False
    allow_empty = False
    of: Type

    def __init__(self, of) -> None:
        super().__init__()
        self.of = of

    @property
    def edges(self) -> List[Type]:
        return [self.of]

    @property
    def type_name(self) -> str:
        return f"list_{self.of.node}"

    def __str__(self) -> str:
        return f"{self.typedef}[{self.of}]"


# string = list(isChar)


class string(list):
    type_name = "string"

    def __init__(self) -> None:
        super().__init__(char())

    @property
    def edges(self) -> List[Type]:
        return [self.of]


class ean(string):
    type_name = "ean"


class uri(string):
    type_name = "uri"


class path(string):
    type_name = "path"


class uuid(string):
    type_name = "uuid"
    _auto: bool = False

    @property
    def auto(self):
        self._auto = True
        return self


class ip(string):
    type_name = "ip"


# regex-able ( x < string )

# phone = string + regex-able(078)


class phone(Type):
    type_name = "phone"


class email(string):
    type_name = "email"


class enum(Type):
    one_of: List[literal]

    def __init__(self, one_of) -> None:
        super().__init__()
        self.one_of = one_of

    @property
    def type_name(self) -> str:
        return f"enum_{', '.join(self.one_of)}"


class set_(Type):
    of: Type

    def __init__(self, of) -> None:
        super().__init__()
        self.of = of

    @property
    def type_name(self) -> str:
        return f"set_{self.of.node}"

    @property
    def edges(self) -> List[Type]:
        return [self.of]


class json(Type):
    type_name = "json"


# kv ( x, y )


class tuple(Type):
    of: List[Type]

    def __init__(self, of) -> None:
        super().__init__()
        self.of = of

    @property
    def type_name(self) -> str:
        return f"tuple_{', '.join(o.node for o in self.of)}"

    @property
    def edges(self) -> List[Type]:
        return self.of


# map = iterable(kv)


def with_property_attribute_error_details(f):
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except AttributeError as e:
            import traceback

            stack = traceback.format_exc()
            raise Exception(f"{e}:\n{stack}")

    return wrapped


# struct = map | x in [...]
class struct(Type):
    of: Dict[str, Type]
    ordered = False
    renames: Dict[str, str]

    def __init__(self, of=None, **kwargs) -> None:
        super().__init__()
        self.renames = {}
        self.of = kwargs if of is None else dict(**of, **kwargs)
        for k, v in self.of.items():
            if not isinstance(v, Type) and not isinstance(v, NodeProxy):
                raise Exception(f"struct only accept type, at {k} got {v}")

    def ids(self):
        ids = {}
        for field, tpe in self.of.items():
            if not isinstance(tpe, NodeProxy) and tpe._id:
                ids[field] = tpe

        return ids

    def __getattr__(self, attr):
        try:
            return super().__getattr__(attr)
        except AttributeError:
            pass

        if attr in self.of:
            return self.of[attr]

        raise Exception(f'no field named "{attr}" in type {self}')

    @property
    def type_name(self) -> str:
        return f"struct{'_'.join(self.of.keys())}"

    @property
    def edges(self) -> List[Type]:
        return [t for t in self.of.values()]

    @property
    def data(self) -> dict:
        return {
            **super().data,
            "renames": frozendict(self.renames),
        }

    def compose(self, of: Dict[str, Type]):
        self.of.update(of)
        return self

    def __str__(self) -> str:
        nested = "\n".join([f"{k}: {v}" for k, v in self.of.items()])
        return f'{self.typedef} {{\n{indent(nested, "  ")}\n}}'


# union ( x, y )
class union(Type):
    of: List[Type]

    def __init__(self, of) -> None:
        super().__init__()
        self.of = of

    @property
    def type_name(self) -> str:
        return f"union_{', '.join(o.node for o in self.of)}"

    @property
    def edges(self) -> List[Type]:
        return self.of


# func x -> y
class func(Type):
    inp: Type
    out: Type
    mat: Materializer
    # if not safe, output will be typechecked
    safe: bool

    rate_calls: bool = False
    rate_weight: Optional[int] = None

    def __init__(self, inp: Type, out: Type, mat: Materializer, safe=True) -> None:
        super().__init__()

        # inp
        # can be a function but other type should not contains any functions
        # no policy in arg

        self.inp = inp
        self.out = out
        self.mat = mat
        self.safe = safe

        self.runtime = mat.runtime

    @property
    def type_name(self) -> str:
        return f"func_{self.inp.node}_{self.out.node}"

    @property
    def edges(self) -> List[Type]:
        return [self.inp, self.out]

    def apply(self, other: "func") -> "func":
        assert self.out == other.inp
        # what if other == gen?
        return func(self, other, IdentityMat())

    def compose(self, of: Dict[str, Type]):
        self.out = self.out.compose(of)
        return self

    def rate(self, weight=None, calls=None):
        self.rate_weight = weight
        if calls is not None:
            self.rate_calls = calls
        return self

    @property
    def data(self) -> dict:
        return {
            **super().data,
            "rate_weight": self.rate_weight,
            "rate_calls": self.rate_calls,
        }

    def __mul__(self, other: "func") -> "func":
        return self.compose(other)


# gen : () -> x
class gen(func):
    def __init__(self, out: Type, mat: Materializer) -> None:
        super().__init__(struct({}), out, mat)

    @property
    def type_name(self) -> str:
        return f"gen_{self.out.node}"


# policy : (a, b, c) -> bool, () -> bool
class policy(func):
    def __init__(self, inp: Type, mat: Materializer) -> None:
        super().__init__(inp, boolean().s_optional(), mat)

    @property
    def type_name(self) -> str:
        return f"policy_{self.inp.node}"
