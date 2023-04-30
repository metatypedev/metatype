# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typegraph import types as t
from typegraph.graph.nodes import NodeProxy


def resolve_entity_quantifier(tpe: t.typedef):
    if isinstance(tpe, t.array):
        return tpe.of
    if isinstance(tpe, t.optional):
        return tpe.of
    return tpe


def undo_optional(tpe: t.typedef):
    if isinstance(tpe, t.optional):
        return tpe.of
    return tpe


def rename_with_idx(tpe: t.typedef, prefix: str):
    return tpe.named(prefix + "_" + tpe.name)


def clean_virtual_link(tpe: t.typedef):
    if isinstance(tpe, t.struct):
        ret = {}
        # renames = {}
        for k, v in tpe.props.items():
            if isinstance(v, NodeProxy):
                v = v.get()

            if isinstance(v, t.func):
                if isinstance(v.out, t.array) and isinstance(v.out.of, t.struct):
                    continue

                # ids = v.inp.of.keys()
                # key = "_".join(ids)
                # if len(ids) <= 1:
                #    key = f"{k}_{key}"
                # renames[k] = key

                out = clean_virtual_link(v.out)
                ret[k] = t.struct(
                    {
                        "create": out.optional(),
                        "createMany": t.struct({"data": t.array(out)}).optional(),
                        "connect": out.optional(),
                        "connectOrCreate": t.struct(
                            {
                                # "where":
                                "create": out,
                            }
                        ).optional(),
                    }
                ).optional()
            else:
                ret[k] = clean_virtual_link(v)

        ret = t.struct(ret)
        # ret.renames = renames
        return ret

    return tpe


def only_unique(tpe: t.Type):
    if isinstance(tpe, t.struct):
        return t.struct({k: only_unique(v) for k, v in tpe.ids().items()})
    return tpe


def optional_root(tpe: t.struct):
    return t.struct({k: v.optional() for k, v in tpe.of.items()})


# temporary redirect stdout to a file
def stdout_to_file(obj: any, filename="stdout.txt"):
    import sys

    original_stdout = sys.stdout
    with open(filename, "w") as f:
        sys.stdout = f
        print(obj)
        sys.stdout = original_stdout
