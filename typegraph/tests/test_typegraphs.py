import frozendict
from typegraph.dist import introspection
from typegraph.graphs.builders import Graph
from typegraph.graphs.builders import TypeMaterializer
from typegraph.graphs.builders import TypeMeta
from typegraph.graphs.builders import TypeNode
from typegraph.graphs.builders import TypePolicy
from typegraph.graphs.builders import TypeRuntime
from typegraph.graphs.typegraph import Cors
from typegraph.utils import loaders


class TestTypegraph:
    def test_introspection(self, overridable) -> None:

        [g] = loaders.find_typegraphs(introspection)

        assert g.build() == overridable(
            Graph(
                types=[
                    TypeNode(
                        name="introspection",
                        typedef="struct",
                        policies=(),
                        runtime=1,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict(
                                    {"__type": 1, "__schema": 78}
                                ),
                            }
                        ),
                    ),
                    TypeNode(
                        name="func_structname_92_optional_type_93_94",
                        typedef="func",
                        policies=(0,),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 0, "input": 2, "output": 5}
                        ),
                    ),
                    TypeNode(
                        name="structname_92",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict({"name": 3}),
                            }
                        ),
                    ),
                    TypeNode(
                        name="string_91",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 4}),
                    ),
                    TypeNode(
                        name="char_90",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_type_93",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="type",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict(
                                    {
                                        "kind": 7,
                                        "name": 8,
                                        "description": 11,
                                        "specifiedByURL": 14,
                                        "fields": 17,
                                        "interfaces": 51,
                                        "possibleTypes": 53,
                                        "enumValues": 55,
                                        "inputFields": 71,
                                        "ofType": 77,
                                    }
                                ),
                            }
                        ),
                    ),
                    TypeNode(
                        name="type_kind",
                        typedef="enum",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_41_42",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 9}),
                    ),
                    TypeNode(
                        name="string_41",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 10}),
                    ),
                    TypeNode(
                        name="char_40",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_44_45",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 12}),
                    ),
                    TypeNode(
                        name="string_44",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 13}),
                    ),
                    TypeNode(
                        name="char_43",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_47_48",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 15}),
                    ),
                    TypeNode(
                        name="string_47",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 16}),
                    ),
                    TypeNode(
                        name="char_46",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="func_structincludeDeprecated_51_optional_list_field_52_53_54",
                        typedef="func",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 18, "output": 21}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_51",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict(
                                    {"includeDeprecated": 19}
                                ),
                            }
                        ),
                    ),
                    TypeNode(
                        name="optional_boolean_49_50",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 20}),
                    ),
                    TypeNode(
                        name="boolean_49",
                        typedef="boolean",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_list_field_52_53",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 22}),
                    ),
                    TypeNode(
                        name="list_field_52",
                        typedef="list",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 23}),
                    ),
                    TypeNode(
                        name="field",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict(
                                    {
                                        "name": 24,
                                        "description": 26,
                                        "args": 29,
                                        "type": 6,
                                        "isDeprecated": 47,
                                        "deprecationReason": 48,
                                    }
                                ),
                            }
                        ),
                    ),
                    TypeNode(
                        name="string_25",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 25}),
                    ),
                    TypeNode(
                        name="char_24",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_27_28",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 27}),
                    ),
                    TypeNode(
                        name="string_27",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 28}),
                    ),
                    TypeNode(
                        name="char_26",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="func_structincludeDeprecated_31_list_input_value_32_33",
                        typedef="func",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 30, "output": 33}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_31",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict(
                                    {"includeDeprecated": 31}
                                ),
                            }
                        ),
                    ),
                    TypeNode(
                        name="optional_boolean_29_30",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 32}),
                    ),
                    TypeNode(
                        name="boolean_29",
                        typedef="boolean",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_input_value_32",
                        typedef="list",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 34}),
                    ),
                    TypeNode(
                        name="input_value",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict(
                                    {
                                        "name": 35,
                                        "description": 37,
                                        "type": 6,
                                        "defaultValue": 40,
                                        "isDeprecated": 43,
                                        "deprecationReason": 44,
                                    }
                                ),
                            }
                        ),
                    ),
                    TypeNode(
                        name="string_12",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 36}),
                    ),
                    TypeNode(
                        name="char_11",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_14_15",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 38}),
                    ),
                    TypeNode(
                        name="string_14",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 39}),
                    ),
                    TypeNode(
                        name="char_13",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_17_18",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 41}),
                    ),
                    TypeNode(
                        name="string_17",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 42}),
                    ),
                    TypeNode(
                        name="char_16",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_19",
                        typedef="boolean",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_21_22",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 45}),
                    ),
                    TypeNode(
                        name="string_21",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 46}),
                    ),
                    TypeNode(
                        name="char_20",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_34",
                        typedef="boolean",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_36_37",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 49}),
                    ),
                    TypeNode(
                        name="string_36",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 50}),
                    ),
                    TypeNode(
                        name="char_35",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_list_type_55_56",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 52}),
                    ),
                    TypeNode(
                        name="list_type_55",
                        typedef="list",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="optional_list_type_57_58",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 54}),
                    ),
                    TypeNode(
                        name="list_type_57",
                        typedef="list",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="func_structincludeDeprecated_61_optional_list_enum_value_62_63_64",
                        typedef="func",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 56, "output": 59}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_61",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict(
                                    {"includeDeprecated": 57}
                                ),
                            }
                        ),
                    ),
                    TypeNode(
                        name="optional_boolean_59_60",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 58}),
                    ),
                    TypeNode(
                        name="boolean_59",
                        typedef="boolean",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_list_enum_value_62_63",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 60}),
                    ),
                    TypeNode(
                        name="list_enum_value_62",
                        typedef="list",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 61}),
                    ),
                    TypeNode(
                        name="enum_value",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict(
                                    {
                                        "name": 62,
                                        "description": 64,
                                        "isDeprecated": 67,
                                        "deprecationReason": 68,
                                    }
                                ),
                            }
                        ),
                    ),
                    TypeNode(
                        name="string_2",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 63}),
                    ),
                    TypeNode(
                        name="char_1",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_4_5",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 65}),
                    ),
                    TypeNode(
                        name="string_4",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 66}),
                    ),
                    TypeNode(
                        name="char_3",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_6",
                        typedef="boolean",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_8_9",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 69}),
                    ),
                    TypeNode(
                        name="string_8",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 70}),
                    ),
                    TypeNode(
                        name="char_7",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="func_structincludeDeprecated_67_optional_list_input_value_68_69_70",
                        typedef="func",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 72, "output": 75}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_67",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict(
                                    {"includeDeprecated": 73}
                                ),
                            }
                        ),
                    ),
                    TypeNode(
                        name="optional_boolean_65_66",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 74}),
                    ),
                    TypeNode(
                        name="boolean_65",
                        typedef="boolean",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_list_input_value_68_69",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 76}),
                    ),
                    TypeNode(
                        name="list_input_value_68",
                        typedef="list",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 34}),
                    ),
                    TypeNode(
                        name="optional_type_105",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="func_struct_103_schema_104",
                        typedef="func",
                        policies=(0,),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 3, "input": 79, "output": 80}
                        ),
                    ),
                    TypeNode(
                        name="struct_103",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict({}),
                            }
                        ),
                    ),
                    TypeNode(
                        name="schema",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict(
                                    {
                                        "description": 81,
                                        "types": 84,
                                        "queryType": 6,
                                        "mutationType": 85,
                                        "subscriptionType": 86,
                                        "directives": 87,
                                    }
                                ),
                            }
                        ),
                    ),
                    TypeNode(
                        name="optional_string_96_97",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 82}),
                    ),
                    TypeNode(
                        name="string_96",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 83}),
                    ),
                    TypeNode(
                        name="char_95",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_type_98",
                        typedef="list",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="optional_type_99",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="optional_type_100",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="list_directive_101",
                        typedef="list",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 88}),
                    ),
                    TypeNode(
                        name="directive",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict(
                                    {
                                        "name": 89,
                                        "description": 91,
                                        "isRepeatable": 94,
                                        "locations": 95,
                                        "args": 97,
                                    }
                                ),
                            }
                        ),
                    ),
                    TypeNode(
                        name="string_74",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 90}),
                    ),
                    TypeNode(
                        name="char_73",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_76_77",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 92}),
                    ),
                    TypeNode(
                        name="string_76",
                        typedef="string",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 93}),
                    ),
                    TypeNode(
                        name="char_75",
                        typedef="char",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_78",
                        typedef="boolean",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_directive_location_79",
                        typedef="list",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 96}),
                    ),
                    TypeNode(
                        name="directive_location",
                        typedef="enum",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="func_structincludeDeprecated_82_list_input_value_83_84",
                        typedef="func",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 98, "output": 101}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_82",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict(
                                    {"includeDeprecated": 99}
                                ),
                            }
                        ),
                    ),
                    TypeNode(
                        name="optional_boolean_80_81",
                        typedef="optional",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 100}),
                    ),
                    TypeNode(
                        name="boolean_80",
                        typedef="boolean",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_input_value_83",
                        typedef="list",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 34}),
                    ),
                ],
                materializers=[
                    TypeMaterializer(
                        name="getType",
                        runtime=0,
                        data=frozendict.frozendict({"serial": False}),
                    ),
                    TypeMaterializer(
                        name="resolver",
                        runtime=0,
                        data=frozendict.frozendict({"serial": False}),
                    ),
                    TypeMaterializer(
                        name="function",
                        runtime=1,
                        data=frozendict.frozendict(
                            {
                                "serial": False,
                                "fn_expr": "(args) => {\n    return true;\n}",
                            }
                        ),
                    ),
                    TypeMaterializer(
                        name="getSchema",
                        runtime=0,
                        data=frozendict.frozendict({"serial": False}),
                    ),
                ],
                runtimes=[
                    TypeRuntime(name="typegraph", data=frozendict.frozendict({})),
                    TypeRuntime(
                        name="deno", data=frozendict.frozendict({"worker": "default"})
                    ),
                ],
                policies=[TypePolicy(name="__allow_all", materializer=2)],
                meta=TypeMeta(
                    secrets=[],
                    cors=Cors(
                        allow_origin=[],
                        allow_headers=[],
                        expose_headers=[],
                        allow_credentials=True,
                        max_age=None,
                    ),
                    auths=[],
                ),
            )
        )
