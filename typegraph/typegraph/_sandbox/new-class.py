# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typegraph import t
from typegraph.graph.typegraph import TypeGraph


with TypeGraph("new-class") as g:

    class infos(t.struct):
        address = t.string()
        phone_number = t.string()

    class medal(t.struct):
        year = t.integer().min(2000).max(2100)
        # type = t.enum(["silver", "gold"])  # reserved

    class university(t.struct):
        name = t.string()
        medals = t.array(medal())  # nested
        infos = infos()  # nested

    # dict_keys(['year'])
    print(medal().props.keys())
    print(university().props.keys())
    print("name " + university().name)

    # FIXME:
    # name prints a dict instead of string, why ?
    x = t.struct({"a": t.integer(), "b": t.integer()})
    print("name: " + x.name)
    # print(medal().name)
    # print(x.name)
