from types import NoneType
from typing import Callable, List, Union, get_origin, ForwardRef, Any
from dataclasses import dataclass, asdict, fields

FORWARD_REFS = {}


class Struct:
    def repr(self):
        return asdict(self)

    @staticmethod
    def try_new(dt_class, val: Any):
        # Object
        ftypes = {f.name: f.type for f in fields(dt_class)}
        attrs = {}
        for f in val:
            fval = val[f]
            ftype = ftypes[f]
            serialized = False
            # Union
            if get_origin(ftype) is Union:
                try:
                    attrs[f] = Struct.try_union(ftype.__args__, fval)
                    serialized = True
                except Exception:
                    pass
            # List
            elif get_origin(ftype) is list:
                try:
                    attrs[f] = Struct.try_typed_list(ftype.__args__, fval)
                    serialized = True
                except Exception:
                    pass
            # Any
            if not serialized:
                if isinstance(ftype, str) and ftype in FORWARD_REFS:
                    klass = FORWARD_REFS[ftype]
                    attrs[f] = Struct.new(klass, fval)
                else:
                    attrs[f] = Struct.new(ftype, fval)
        return dt_class(**attrs)

    @staticmethod
    def try_typed_list(tpe: Any, items: Any):
        hint = tpe.__args__[0]
        klass = (
            FORWARD_REFS[hint.__forward_arg__] if isinstance(hint, ForwardRef) else hint
        )
        return [Struct.new(klass, v) for v in items]

    @staticmethod
    def try_union(variants: List[Any], val: Any):
        errors = []
        for variant in variants:
            try:
                if variant is NoneType:
                    if val is None:
                        return None
                    else:
                        continue
                if get_origin(variant) is list:
                    if isinstance(val, list):
                        return Struct.try_typed_list(variant, val)
                    else:
                        continue
                klass = FORWARD_REFS[variant.__forward_arg__]
                return Struct.try_new(klass, val)
            except Exception as e:
                errors.append(str(e))
        raise Exception("\n".join(errors))

    @staticmethod
    def new(dt_class: Any, val: Any):
        try:
            return Struct.try_new(dt_class, val)
        except Exception:
            return val


@dataclass
class Primitives(Struct):
    str: str
    enum: str
    uuid: str
    email: str
    ean: str
    json: str
    uri: str
    date: str
    datetime: str
    int: int
    float: float
    boolean: bool


FORWARD_REFS["Primitives"] = Primitives


@dataclass
class PrimitivesArgs(Struct):
    data: "Primitives"


FORWARD_REFS["PrimitivesArgs"] = PrimitivesArgs


@dataclass
class CompositesArgs(Struct):
    data: "Composites"


FORWARD_REFS["CompositesArgs"] = CompositesArgs


@dataclass
class Composites(Struct):
    opt: Union[str, None]
    either: Union["Primitives", "Branch2"]
    union: Union[List[str], str, int]
    list: List[str]


FORWARD_REFS["Composites"] = Composites


@dataclass
class Branch2(Struct):
    branch2: str


FORWARD_REFS["Branch2"] = Branch2


@dataclass
class Cycles1Args(Struct):
    data: "Cycles1"


FORWARD_REFS["Cycles1Args"] = Cycles1Args


@dataclass
class Cycles1(Struct):
    phantom1: Union[str, None]
    to2: Union[Union[Union["Branch33B", "Branch33A"], "Cycles1"], None]
    list3: Union[List[Union["Branch33A", "Branch33B"]], None]


FORWARD_REFS["Cycles1"] = Cycles1


@dataclass
class Branch33A(Struct):
    phantom3a: Union[str, None]
    to1: Union["Cycles1", None]


FORWARD_REFS["Branch33A"] = Branch33A


@dataclass
class Branch33B(Struct):
    phantom3b: Union[str, None]
    to2: Union[Union[Union["Branch33A", "Branch33B"], "Cycles1"], None]


FORWARD_REFS["Branch33B"] = Branch33B


@dataclass
class SimpleCycles1Args(Struct):
    data: "SimpleCycles1"


FORWARD_REFS["SimpleCycles1Args"] = SimpleCycles1Args


@dataclass
class SimpleCycles1(Struct):
    phantom1: Union[str, None]
    to2: Union["SimpleCycles2", None]


FORWARD_REFS["SimpleCycles1"] = SimpleCycles1


@dataclass
class SimpleCycles2(Struct):
    phantom2: Union[str, None]
    to3: Union["SimpleCycles3", None]


FORWARD_REFS["SimpleCycles2"] = SimpleCycles2


@dataclass
class SimpleCycles3(Struct):
    phantom3: Union[str, None]
    to1: Union["SimpleCycles1", None]


FORWARD_REFS["SimpleCycles3"] = SimpleCycles3


def __repr(value: Any):
    if isinstance(value, Struct):
        return value.repr()
    return value


def typed_cycles(user_fn: Callable[[Cycles1Args], Cycles1]):
    def exported_wrapper(raw_inp):
        inp: Cycles1Args = Struct.new(Cycles1Args, raw_inp)
        out: Cycles1 = user_fn(inp)
        if isinstance(out, list):
            return [__repr(v) for v in out]
        return __repr(out)

    return exported_wrapper


def typed_simple_cycles(user_fn: Callable[[SimpleCycles1Args], SimpleCycles1]):
    def exported_wrapper(raw_inp):
        inp: SimpleCycles1Args = Struct.new(SimpleCycles1Args, raw_inp)
        out: SimpleCycles1 = user_fn(inp)
        if isinstance(out, list):
            return [__repr(v) for v in out]
        return __repr(out)

    return exported_wrapper


def typed_composites(user_fn: Callable[[CompositesArgs], Composites]):
    def exported_wrapper(raw_inp):
        inp: CompositesArgs = Struct.new(CompositesArgs, raw_inp)
        out: Composites = user_fn(inp)
        if isinstance(out, list):
            return [__repr(v) for v in out]
        return __repr(out)

    return exported_wrapper


def typed_primitives(user_fn: Callable[[PrimitivesArgs], Primitives]):
    def exported_wrapper(raw_inp):
        inp: PrimitivesArgs = Struct.new(PrimitivesArgs, raw_inp)
        out: Primitives = user_fn(inp)
        if isinstance(out, list):
            return [__repr(v) for v in out]
        return __repr(out)

    return exported_wrapper
