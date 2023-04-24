# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typegraph import t
from typegraph.graph.typegraph import TypeGraph


with TypeGraph("sandbox") as g:

    class infos(t.cls_struct):
        address = t.string()
        phone_number = t.string()

    class medal(t.cls_struct):
        year = t.integer().min(2000).max(2100)
        type = t.enum(["silver", "gold"])

    class university(t.cls_struct):
        name = t.string()
        medals = t.array(medal().struct())  # nested
        infos = infos().struct()  # nested

    univ = university("Some Univ")

    assert univ.struct() is univ.struct()

    print(univ.struct().infos.props.keys())
    print(univ.struct().props.keys())
