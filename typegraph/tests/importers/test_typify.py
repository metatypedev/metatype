from typegraph import types as t
from typegraph.graph.typegraph import TypeGraph
from typegraph.importers.base.typify import Typify


class TestImporterTypify:
    def test_simple_types(self, overridable):
        tp = Typify("t")
        with TypeGraph(""):
            assert tp(t.boolean()) == overridable("t.boolean()")
            assert tp(t.number()) == overridable("t.number()")
            assert tp(t.integer()) == overridable("t.integer()")
            assert tp(t.string()) == overridable("t.string()")

    def test_simple_types_with_constraints(self, overridable):
        tp = Typify("t")
        with TypeGraph(""):
            assert tp(t.number(x_min=0, x_max=10)) == overridable(
                "t.number().x_min(0).x_max(10)"
            )
            assert tp(t.uuid()) == overridable("t.string().format('uuid')")

    def test_optional(self, overridable):
        tp = Typify("t")
        with TypeGraph(""):
            assert tp(t.optional(t.number())) == overridable("t.number().optional()")
            assert tp(t.string(min=12)) == overridable("t.string().min(12)")

    def test_struct(self, overridable):
        tp = Typify("t")
        with TypeGraph("") as g:
            assert tp(
                t.struct(
                    {"id": t.uuid(), "email": t.email(), "friends": g("User")}
                ).named("User")
            ) == overridable(
                "t.struct({'id': t.string().format('uuid'), 'email': t.string().format('email'), 'friends': t.proxy('User'})"
            )
