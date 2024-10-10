from types import NoneType
from typing import Callable, List, Union, get_origin, ForwardRef, Any
from dataclasses import dataclass, asdict, fields

FORWARD_REFS = {}


class Ctx:
    def gql(self, query: str, variables: str) -> Any:
        pass


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
class RootSumFnInput(Struct):
    first: float
    second: float


FORWARD_REFS["RootSumFnInput"] = RootSumFnInput


TypeRootSumFnInputFirstFloat = float


def __repr(value: Any):
    if isinstance(value, Struct):
        return value.repr()
    return value


def typed_remote_sum(
    user_fn: Callable[[RootSumFnInput, Ctx], TypeRootSumFnInputFirstFloat],
):
    def exported_wrapper(raw_inp, ctx):
        inp: RootSumFnInput = Struct.new(RootSumFnInput, raw_inp)
        out: TypeRootSumFnInputFirstFloat = user_fn(inp, ctx)
        if isinstance(out, list):
            return [__repr(v) for v in out]
        return __repr(out)

    return exported_wrapper
