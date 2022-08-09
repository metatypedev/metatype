import frozendict
from typegraph.dist import introspection
from typegraph.graphs.builders import Graph
from typegraph.graphs.builders import TypeMaterializer
from typegraph.graphs.builders import TypeNode
from typegraph.graphs.builders import TypePolicy
from typegraph.graphs.builders import TypeRuntime
from typegraph.graphs.typegraph import Code
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
                        edges=(1, 78),
                        policies=(),
                        runtime=2,
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
                        edges=(2, 5),
                        policies=(0,),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 0, "input": 2, "output": 5}
                        ),
                    ),
                    TypeNode(
                        name="structname_92",
                        typedef="struct",
                        edges=(3,),
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
                        edges=(4,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 4}),
                    ),
                    TypeNode(
                        name="char_90",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_type_93",
                        typedef="optional",
                        edges=(6,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="type",
                        typedef="struct",
                        edges=(7, 8, 11, 14, 17, 51, 53, 55, 71, 77),
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
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_41_42",
                        typedef="optional",
                        edges=(9,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 9}),
                    ),
                    TypeNode(
                        name="string_41",
                        typedef="string",
                        edges=(10,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 10}),
                    ),
                    TypeNode(
                        name="char_40",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_44_45",
                        typedef="optional",
                        edges=(12,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 12}),
                    ),
                    TypeNode(
                        name="string_44",
                        typedef="string",
                        edges=(13,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 13}),
                    ),
                    TypeNode(
                        name="char_43",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_47_48",
                        typedef="optional",
                        edges=(15,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 15}),
                    ),
                    TypeNode(
                        name="string_47",
                        typedef="string",
                        edges=(16,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 16}),
                    ),
                    TypeNode(
                        name="char_46",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="func_structincludeDeprecated_51_optional_list_field_52_53_54",
                        typedef="func",
                        edges=(18, 21),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 18, "output": 21}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_51",
                        typedef="struct",
                        edges=(19,),
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
                        edges=(20,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 20}),
                    ),
                    TypeNode(
                        name="boolean_49",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_list_field_52_53",
                        typedef="optional",
                        edges=(22,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 22}),
                    ),
                    TypeNode(
                        name="list_field_52",
                        typedef="list",
                        edges=(23,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 23}),
                    ),
                    TypeNode(
                        name="field",
                        typedef="struct",
                        edges=(24, 26, 29, 6, 47, 48),
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
                        edges=(25,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 25}),
                    ),
                    TypeNode(
                        name="char_24",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_27_28",
                        typedef="optional",
                        edges=(27,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 27}),
                    ),
                    TypeNode(
                        name="string_27",
                        typedef="string",
                        edges=(28,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 28}),
                    ),
                    TypeNode(
                        name="char_26",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="func_structincludeDeprecated_31_list_input_value_32_33",
                        typedef="func",
                        edges=(30, 33),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 30, "output": 33}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_31",
                        typedef="struct",
                        edges=(31,),
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
                        edges=(32,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 32}),
                    ),
                    TypeNode(
                        name="boolean_29",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_input_value_32",
                        typedef="list",
                        edges=(34,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 34}),
                    ),
                    TypeNode(
                        name="input_value",
                        typedef="struct",
                        edges=(35, 37, 6, 40, 43, 44),
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
                        edges=(36,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 36}),
                    ),
                    TypeNode(
                        name="char_11",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_14_15",
                        typedef="optional",
                        edges=(38,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 38}),
                    ),
                    TypeNode(
                        name="string_14",
                        typedef="string",
                        edges=(39,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 39}),
                    ),
                    TypeNode(
                        name="char_13",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_17_18",
                        typedef="optional",
                        edges=(41,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 41}),
                    ),
                    TypeNode(
                        name="string_17",
                        typedef="string",
                        edges=(42,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 42}),
                    ),
                    TypeNode(
                        name="char_16",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_19",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_21_22",
                        typedef="optional",
                        edges=(45,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 45}),
                    ),
                    TypeNode(
                        name="string_21",
                        typedef="string",
                        edges=(46,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 46}),
                    ),
                    TypeNode(
                        name="char_20",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_34",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_36_37",
                        typedef="optional",
                        edges=(49,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 49}),
                    ),
                    TypeNode(
                        name="string_36",
                        typedef="string",
                        edges=(50,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 50}),
                    ),
                    TypeNode(
                        name="char_35",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_list_type_55_56",
                        typedef="optional",
                        edges=(52,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 52}),
                    ),
                    TypeNode(
                        name="list_type_55",
                        typedef="list",
                        edges=(6,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="optional_list_type_57_58",
                        typedef="optional",
                        edges=(54,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 54}),
                    ),
                    TypeNode(
                        name="list_type_57",
                        typedef="list",
                        edges=(6,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="func_structincludeDeprecated_61_optional_list_enum_value_62_63_64",
                        typedef="func",
                        edges=(56, 59),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 56, "output": 59}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_61",
                        typedef="struct",
                        edges=(57,),
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
                        edges=(58,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 58}),
                    ),
                    TypeNode(
                        name="boolean_59",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_list_enum_value_62_63",
                        typedef="optional",
                        edges=(60,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 60}),
                    ),
                    TypeNode(
                        name="list_enum_value_62",
                        typedef="list",
                        edges=(61,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 61}),
                    ),
                    TypeNode(
                        name="enum_value",
                        typedef="struct",
                        edges=(62, 64, 67, 68),
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
                        edges=(63,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 63}),
                    ),
                    TypeNode(
                        name="char_1",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_4_5",
                        typedef="optional",
                        edges=(65,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 65}),
                    ),
                    TypeNode(
                        name="string_4",
                        typedef="string",
                        edges=(66,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 66}),
                    ),
                    TypeNode(
                        name="char_3",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_6",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_8_9",
                        typedef="optional",
                        edges=(69,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 69}),
                    ),
                    TypeNode(
                        name="string_8",
                        typedef="string",
                        edges=(70,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 70}),
                    ),
                    TypeNode(
                        name="char_7",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="func_structincludeDeprecated_67_optional_list_input_value_68_69_70",
                        typedef="func",
                        edges=(72, 75),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 72, "output": 75}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_67",
                        typedef="struct",
                        edges=(73,),
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
                        edges=(74,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 74}),
                    ),
                    TypeNode(
                        name="boolean_65",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_list_input_value_68_69",
                        typedef="optional",
                        edges=(76,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 76}),
                    ),
                    TypeNode(
                        name="list_input_value_68",
                        typedef="list",
                        edges=(34,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 34}),
                    ),
                    TypeNode(
                        name="optional_type_105",
                        typedef="optional",
                        edges=(6,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="func_struct_103_schema_104",
                        typedef="func",
                        edges=(79, 80),
                        policies=(0,),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 3, "input": 79, "output": 80}
                        ),
                    ),
                    TypeNode(
                        name="struct_103",
                        typedef="struct",
                        edges=(),
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
                        edges=(81, 84, 6, 85, 86, 87),
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
                        edges=(82,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 82}),
                    ),
                    TypeNode(
                        name="string_96",
                        typedef="string",
                        edges=(83,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 83}),
                    ),
                    TypeNode(
                        name="char_95",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_type_98",
                        typedef="list",
                        edges=(6,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="optional_type_99",
                        typedef="optional",
                        edges=(6,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="optional_type_100",
                        typedef="optional",
                        edges=(6,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="list_directive_101",
                        typedef="list",
                        edges=(88,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 88}),
                    ),
                    TypeNode(
                        name="directive",
                        typedef="struct",
                        edges=(89, 91, 94, 95, 97),
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
                        edges=(90,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 90}),
                    ),
                    TypeNode(
                        name="char_73",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_76_77",
                        typedef="optional",
                        edges=(92,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 92}),
                    ),
                    TypeNode(
                        name="string_76",
                        typedef="string",
                        edges=(93,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 93}),
                    ),
                    TypeNode(
                        name="char_75",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_78",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_directive_location_79",
                        typedef="list",
                        edges=(96,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 96}),
                    ),
                    TypeNode(
                        name="directive_location",
                        typedef="enum",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="func_structincludeDeprecated_82_list_input_value_83_84",
                        typedef="func",
                        edges=(98, 101),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 98, "output": 101}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_82",
                        typedef="struct",
                        edges=(99,),
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
                        edges=(100,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 100}),
                    ),
                    TypeNode(
                        name="boolean_80",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_input_value_83",
                        typedef="list",
                        edges=(34,),
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
                            {"serial": False, "name": "allow_all"}
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
                        name="worker", data=frozendict.frozendict({"name": "js"})
                    ),
                    TypeRuntime(name="deno", data=frozendict.frozendict({})),
                ],
                policies=[TypePolicy(name="__allow_all", materializer=2)],
                codes=[
                    Code(
                        name="allow_all",
                        source="(args) => {\n    return true;\n}",
                        type="func",
                    )
                ],
            )
        )
