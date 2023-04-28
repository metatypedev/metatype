# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typegraph import t
from typegraph.graph.typegraph import TypeGraph


with TypeGraph("new-class") as g:

    class infos(t.struct):
        address = t.string()
        phone_number = t.string()

    class medal(t.struct):
        year = t.integer().min(2000).max(2100)
        type = t.enum(["silver", "gold"])

    class university(t.struct):
        name = t.string()
        medals = t.array(medal())  # nested
        infos = infos()  # nested

    # dict_keys(['year'])
    # print(medal().props.keys())
    print(medal().name)

    # dict_keys(['infos', 'medals'])
    # print(university().props.keys())
    # print(university().name)
    # univ = university("Some Univ")

    x = t.struct({"a": t.integer(), "b": t.integer()})
    print(x.name)

    # assert univ.struct() is univ.struct()
    # assert isinstance(univ.struct().props["infos"], t.struct)
