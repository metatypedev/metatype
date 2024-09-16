from typegraph import t, typegraph, Graph, Policy
from typegraph.runtimes import DenoRuntime


@typegraph()
def type_comparison(g: Graph):
    deno = DenoRuntime()
    cases = {}

    def case(name: str, subtype: t.typedef, supertype: t.typedef):
        name = name + "_test_type"
        cases[name] = deno.identity(
            t.struct(
                {
                    "parent_field": subtype.rename(name),
                }
            )
        ).extend(
            {
                "injected": deno.identity(t.struct({"field": supertype})).reduce(
                    {"field": g.inherit().from_parent(name)}
                )
            }
        )

    case("integer_ok_1", t.integer(), t.integer())
    case("integer_ok_2", t.integer(min=12), t.integer())
    case("integer_ok_3", t.integer(min=12), t.integer(min=6))
    case("integer_ok_4", t.integer(max=12), t.integer())
    case("integer_ok_5", t.integer(max=12), t.integer(max=13))
    case("integer_ok_6", t.integer(min=12, max=13), t.integer(min=6, max=14))
    case("integer_ok_7", t.integer(multiple_of=12), t.integer())
    case("integer_ok_8", t.integer(multiple_of=12), t.integer(multiple_of=6))
    case("integer_fail_1", t.integer(), t.integer(min=12))
    case("integer_fail_2", t.integer(min=12), t.integer(min=13))
    case("integer_fail_3", t.integer(max=12), t.integer(max=11))
    case("integer_fail_4", t.integer(min=9, max=13), t.integer(min=10, max=12))
    case("integer_fail_5", t.integer(multiple_of=12), t.integer(multiple_of=8))
    case("integer_fail_6", t.integer(multiple_of=6), t.integer(multiple_of=12))

    case("float_ok_1", t.float(), t.float())
    case("float_ok_2", t.float(min=12), t.float())
    case("float_ok_3", t.float(min=12), t.float(min=6))
    case("float_ok_4", t.float(max=12), t.float())
    case("float_ok_5", t.float(max=12), t.float(max=13))
    case("float_ok_6", t.float(min=12, max=13), t.float(min=6, max=14))
    case("float_ok_7", t.float(multiple_of=12), t.float())
    case("float_ok_8", t.float(multiple_of=12.2), t.float(multiple_of=6.1))
    case("float_fail_1", t.float(), t.float(min=12))
    case("float_fail_2", t.float(min=12), t.float(min=13))
    case("float_fail_3", t.float(max=12), t.float(max=11))
    case("float_fail_4", t.float(min=9, max=13), t.float(min=6, max=12))
    case("float_fail_5", t.float(multiple_of=12), t.float(multiple_of=5.999))
    case("float_fail_6", t.float(multiple_of=6), t.float(multiple_of=12))

    g.expose(Policy.public(), **cases)
