import frozendict
from typegraph.dist import introspection
from typegraph.graphs.builders import Graph
from typegraph.graphs.builders import TypeMaterializer
from typegraph.graphs.builders import TypeNode
from typegraph.graphs.builders import TypePolicy
from typegraph.graphs.builders import TypeRuntime
from typegraph.utils import loaders


class TestTypegraph:
    def est_introspection(self, overridable) -> None:

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
                                "binds": frozendict.frozendict(
                                    {"__type": 1, "__schema": 78}
                                )
                            }
                        ),
                    ),
                    TypeNode(
                        name="func_structname_4448616848_optional_type_4448617424_4448616656",
                        typedef="func",
                        edges=(2, 5),
                        policies=(0,),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 0, "input": 2, "output": 5}
                        ),
                    ),
                    TypeNode(
                        name="structname_4448616848",
                        typedef="struct",
                        edges=(3,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"binds": frozendict.frozendict({"name": 3})}
                        ),
                    ),
                    TypeNode(
                        name="string_4446954848",
                        typedef="string",
                        edges=(4,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 4}),
                    ),
                    TypeNode(
                        name="char_4446954608",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_type_4448617424",
                        typedef="optional",
                        edges=(6,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="type",
                        typedef="struct",
                        edges=(7, 8, 11, 14, 17, 51, 53, 55, 71, 77),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
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
                                )
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
                        name="optional_string_4446020576_4446026048",
                        typedef="optional",
                        edges=(9,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="string_4446020576",
                        typedef="string",
                        edges=(10,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 10}),
                    ),
                    TypeNode(
                        name="char_4446023024",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_4446019136_4446019376",
                        typedef="optional",
                        edges=(12,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="string_4446019136",
                        typedef="string",
                        edges=(13,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 13}),
                    ),
                    TypeNode(
                        name="char_4446019040",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_4446023120_4446017600",
                        typedef="optional",
                        edges=(15,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="string_4446023120",
                        typedef="string",
                        edges=(16,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 16}),
                    ),
                    TypeNode(
                        name="char_4446023168",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="func_structincludeDeprecated_4446026960_optional_list_field_4446018464_4446021200_4446020960",
                        typedef="func",
                        edges=(18, 21),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 18, "output": 21}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_4446026960",
                        typedef="struct",
                        edges=(19,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"binds": frozendict.frozendict({"includeDeprecated": 19})}
                        ),
                    ),
                    TypeNode(
                        name="optional_boolean_4446025040_4446018608",
                        typedef="optional",
                        edges=(20,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_4446025040",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_list_field_4446018464_4446021200",
                        typedef="optional",
                        edges=(22,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_field_4446018464",
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
                                "binds": frozendict.frozendict(
                                    {
                                        "name": 24,
                                        "description": 26,
                                        "args": 29,
                                        "type": 6,
                                        "isDeprecated": 47,
                                        "deprecationReason": 48,
                                    }
                                )
                            }
                        ),
                    ),
                    TypeNode(
                        name="string_4446018800",
                        typedef="string",
                        edges=(25,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 25}),
                    ),
                    TypeNode(
                        name="char_4446017504",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_4446017360_4446025760",
                        typedef="optional",
                        edges=(27,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="string_4446017360",
                        typedef="string",
                        edges=(28,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 28}),
                    ),
                    TypeNode(
                        name="char_4446017264",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="func_structincludeDeprecated_4446026288_list_input_value_4446021104_4446022208",
                        typedef="func",
                        edges=(30, 33),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 30, "output": 33}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_4446026288",
                        typedef="struct",
                        edges=(31,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"binds": frozendict.frozendict({"includeDeprecated": 31})}
                        ),
                    ),
                    TypeNode(
                        name="optional_boolean_4446018320_4446022496",
                        typedef="optional",
                        edges=(32,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_4446018320",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_input_value_4446021104",
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
                                "binds": frozendict.frozendict(
                                    {
                                        "name": 35,
                                        "description": 37,
                                        "type": 6,
                                        "defaultValue": 40,
                                        "isDeprecated": 43,
                                        "deprecationReason": 44,
                                    }
                                )
                            }
                        ),
                    ),
                    TypeNode(
                        name="string_4446024224",
                        typedef="string",
                        edges=(36,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 36}),
                    ),
                    TypeNode(
                        name="char_4446026192",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_4446025280_4446019904",
                        typedef="optional",
                        edges=(38,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="string_4446025280",
                        typedef="string",
                        edges=(39,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 39}),
                    ),
                    TypeNode(
                        name="char_4446023312",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_4446016784_4446027248",
                        typedef="optional",
                        edges=(41,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="string_4446016784",
                        typedef="string",
                        edges=(42,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 42}),
                    ),
                    TypeNode(
                        name="char_4446020048",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_4446020096",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_4446018272_4446022640",
                        typedef="optional",
                        edges=(45,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="string_4446018272",
                        typedef="string",
                        edges=(46,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 46}),
                    ),
                    TypeNode(
                        name="char_4446016832",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_4446018416",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_4446024176_4446018704",
                        typedef="optional",
                        edges=(49,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="string_4446024176",
                        typedef="string",
                        edges=(50,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 50}),
                    ),
                    TypeNode(
                        name="char_4446016112",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_list_type_4446020864_4446024560",
                        typedef="optional",
                        edges=(52,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_type_4446020864",
                        typedef="list",
                        edges=(6,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="optional_list_type_4446023552_4446016448",
                        typedef="optional",
                        edges=(54,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_type_4446023552",
                        typedef="list",
                        edges=(6,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="func_structincludeDeprecated_4446022688_optional_list_enum_value_4446024272_4446023792_4446016304",
                        typedef="func",
                        edges=(56, 59),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 56, "output": 59}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_4446022688",
                        typedef="struct",
                        edges=(57,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"binds": frozendict.frozendict({"includeDeprecated": 57})}
                        ),
                    ),
                    TypeNode(
                        name="optional_boolean_4446020624_4446022160",
                        typedef="optional",
                        edges=(58,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_4446020624",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_list_enum_value_4446024272_4446023792",
                        typedef="optional",
                        edges=(60,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_enum_value_4446024272",
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
                                "binds": frozendict.frozendict(
                                    {
                                        "name": 62,
                                        "description": 64,
                                        "isDeprecated": 67,
                                        "deprecationReason": 68,
                                    }
                                )
                            }
                        ),
                    ),
                    TypeNode(
                        name="string_4446026768",
                        typedef="string",
                        edges=(63,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 63}),
                    ),
                    TypeNode(
                        name="char_4446018896",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_4446025376_4446024032",
                        typedef="optional",
                        edges=(65,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="string_4446025376",
                        typedef="string",
                        edges=(66,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 66}),
                    ),
                    TypeNode(
                        name="char_4446024896",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_4446023696",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_4446016160_4446022448",
                        typedef="optional",
                        edges=(69,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="string_4446016160",
                        typedef="string",
                        edges=(70,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 70}),
                    ),
                    TypeNode(
                        name="char_4446026096",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="func_structincludeDeprecated_4446018752_optional_list_input_value_4446025856_4446027008_4446020384",
                        typedef="func",
                        edges=(72, 75),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 72, "output": 75}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_4446018752",
                        typedef="struct",
                        edges=(73,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"binds": frozendict.frozendict({"includeDeprecated": 73})}
                        ),
                    ),
                    TypeNode(
                        name="optional_boolean_4446023360_4446018224",
                        typedef="optional",
                        edges=(74,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_4446023360",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_list_input_value_4446025856_4446027008",
                        typedef="optional",
                        edges=(76,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_input_value_4446025856",
                        typedef="list",
                        edges=(34,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 34}),
                    ),
                    TypeNode(
                        name="optional_type_4446022112",
                        typedef="optional",
                        edges=(6,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="func_struct_4448617904_schema_4448618096",
                        typedef="func",
                        edges=(79, 80),
                        policies=(0,),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 3, "input": 79, "output": 80}
                        ),
                    ),
                    TypeNode(
                        name="struct_4448617904",
                        typedef="struct",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"binds": frozendict.frozendict({})}
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
                                "binds": frozendict.frozendict(
                                    {
                                        "description": 81,
                                        "types": 84,
                                        "queryType": 6,
                                        "mutationType": 85,
                                        "subscriptionType": 86,
                                        "directives": 87,
                                    }
                                )
                            }
                        ),
                    ),
                    TypeNode(
                        name="optional_string_4448616704_4448617184",
                        typedef="optional",
                        edges=(82,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="string_4448616704",
                        typedef="string",
                        edges=(83,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 83}),
                    ),
                    TypeNode(
                        name="char_4448617088",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_type_4448617232",
                        typedef="list",
                        edges=(6,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 6}),
                    ),
                    TypeNode(
                        name="optional_type_4448616992",
                        typedef="optional",
                        edges=(6,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_type_4448617616",
                        typedef="optional",
                        edges=(6,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_directive_4448617712",
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
                                "binds": frozendict.frozendict(
                                    {
                                        "name": 89,
                                        "description": 91,
                                        "isRepeatable": 94,
                                        "locations": 95,
                                        "args": 97,
                                    }
                                )
                            }
                        ),
                    ),
                    TypeNode(
                        name="string_4446175344",
                        typedef="string",
                        edges=(90,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 90}),
                    ),
                    TypeNode(
                        name="char_4446175392",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="optional_string_4446175536_4446175728",
                        typedef="optional",
                        edges=(92,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="string_4446175536",
                        typedef="string",
                        edges=(93,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 93}),
                    ),
                    TypeNode(
                        name="char_4446175584",
                        typedef="char",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_4446175824",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_directive_location_4446175920",
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
                        name="func_structincludeDeprecated_4446176208_list_input_value_4446176304_4446176496",
                        typedef="func",
                        edges=(98, 101),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 98, "output": 101}
                        ),
                    ),
                    TypeNode(
                        name="structincludeDeprecated_4446176208",
                        typedef="struct",
                        edges=(99,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"binds": frozendict.frozendict({"includeDeprecated": 99})}
                        ),
                    ),
                    TypeNode(
                        name="optional_boolean_4446176016_4446176112",
                        typedef="optional",
                        edges=(100,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="boolean_4446176016",
                        typedef="boolean",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="list_input_value_4446176304",
                        typedef="list",
                        edges=(34,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({"of": 34}),
                    ),
                ],
                materializers=[
                    TypeMaterializer(
                        name="getType", runtime=0, data=frozendict.frozendict({})
                    ),
                    TypeMaterializer(
                        name="resolver", runtime=0, data=frozendict.frozendict({})
                    ),
                    TypeMaterializer(
                        name="policy",
                        runtime=1,
                        data=frozendict.frozendict(
                            {"code": "(args) => {\n    return true;\n}"}
                        ),
                    ),
                    TypeMaterializer(
                        name="getSchema", runtime=0, data=frozendict.frozendict({})
                    ),
                ],
                runtimes=[
                    TypeRuntime(name="typegraph", data=frozendict.frozendict({})),
                    TypeRuntime(name="worker", data=frozendict.frozendict({})),
                    TypeRuntime(name="deno", data=frozendict.frozendict({})),
                ],
                policies=[TypePolicy(name="allow_all", materializer=2)],
            )
        )
