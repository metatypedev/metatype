# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typegraph import t
from typegraph.graph.typegraph import TypeGraph


with TypeGraph("sandbox") as g:

    class infos(t.custom):
        address = t.string()
        phone_number = t.string()

    class medal(t.custom):
        year = t.integer().min(2000).max(2100)
        type = t.enum(["silver", "gold"])

    class university(t.custom):
        name = t.string()
        medals = t.array(medal().struct())  # nested
        infos = infos()  # nested

    univ = university("Some Univ")

    assert univ.struct() is univ.struct()
    assert isinstance(univ.struct().props["infos"], t.struct)
    assert univ.infos
