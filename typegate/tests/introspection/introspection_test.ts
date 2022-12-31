// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

// https://github.com/graphql/graphql-js/blob/main/src/__tests__/starWarsIntrospection-test.ts

test("Basic introspection", async (t) => {
  const e = await t.pythonFile("simple/simple.py");

  await t.should("allow querying the schema for types", async () => {
    await gql`
      query IntrospectionQuery {
        __schema {
          types {
            name
          }
        }
      }
    `
      .expectData({
        __schema: {
          types: [
            {
              "name": "Int",
            },
            {
              "name": "NestedInp",
            },
            {
              "name": "res",
            },
            {
              "name": "Query",
            },
          ],
        },
      })
      .on(e);
  });

  await t.should("allow querying the schema for query type", async () => {
    await gql`
      query IntrospectionQuery {
        __schema {
          queryType {
            name
          }
        }
      }
    `
      .expectData({
        __schema: {
          queryType: {
            name: "Query",
          },
        },
      })
      .on(e);
  });

  await t.should("allow querying the schema for a specific type", async () => {
    await gql`
      query IntrospectionQuery {
        __type(name: "inp") {
          name
        }
      }
    `.expectData({
      __type: {
        name: "inp",
      },
    }).on(e);
  });

  await t.should("allow queriing the schema for an object kind", async () => {
    await gql`
      query IntrospectionQuery {
        __type(name: "inp") {
          name kind
        }
      }
    `.expectData({
      __type: {
        name: "inp",
        kind: "OBJECT",
      },
    }).on(e);
  });

  await t.should("allow querying the schema for object fields", async () => {
    // TODO always name types
    await gql`
      query IntrospectionQuery {
        __type(name: "inp") {
          name
          fields {
            name
            type {
              name
              kind
            }
          }
        }
      }
    `
      .expectData({
        __type: {
          name: "inp",
          fields: [
            {
              name: "a",
              type: {
                name: null,
                kind: "NON_NULL",
              },
            },
          ],
        },
      })
      .on(e);
  });

  await t.should(
    "allow querying the schema for nested object fields",
    async () => {
      await gql`
        query IntrospectionQuery {
          __type(name: "inp") {
            name
            fields {
              name
              type {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
            }
          }
        }
      `
        .expectData({
          __type: {
            name: "inp",
            fields: [
              {
                name: "a",
                type: {
                  name: null,
                  kind: "NON_NULL",
                  ofType: {
                    name: "Int",
                    kind: "SCALAR",
                  },
                },
              },
            ],
          },
        })
        .on(e);
    },
  );

  await t.should("allow querying the schema for field args", async () => {
    await gql`
      query IntrospectionQuery {
        __schema {
          queryType {
            fields {
              name
              args {
                description
                type {
                  name
                  kind
                  ofType {
                    name
                    kind
                  }
                }
                defaultValue
              }
            }
          }
        }
      }
    `
      .expectData({
        // FIXME non-deterministic order of the fields
        __schema: {
          queryType: {
            fields: [
              {
                args: [
                  {
                    defaultValue: null,
                    description: "a input field",
                    type: {
                      kind: "NON_NULL",
                      name: null,
                      ofType: {
                        kind: "SCALAR",
                        name: "Int",
                      },
                    },
                  },
                ],
                name: "test",
              },
              {
                args: [
                  {
                    defaultValue: null,
                    description: "nested input field",
                    type: {
                      kind: "NON_NULL",
                      name: null,
                      ofType: {
                        kind: "INPUT_OBJECT",
                        name: "NestedInp",
                      },
                    },
                  },
                ],
                name: "rec",
              },
            ],
          },
        },
      })
      .on(e);
  });
}, { introspection: true });

test("Full introspection", async (t) => {
  const e = await t.pythonFile("simple/simple.py");

  await t.should("not fail", async () => {
    await gql`
      query IntrospectionQuery {
        __schema {
          
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            ...FullType
          }
          directives {
            name
            description
            
            locations
            args {
              ...InputValue
            }
          }
        }
      }

      fragment FullType on __Type {
        kind
        name
        description
        
        fields(includeDeprecated: true) {
          name
          description
          args {
            ...InputValue
          }
          type {
            ...TypeRef
          }
          isDeprecated
          deprecationReason
        }
        inputFields {
          ...InputValue
        }
        interfaces {
          ...TypeRef
        }
        enumValues(includeDeprecated: true) {
          name
          description
          isDeprecated
          deprecationReason
        }
        possibleTypes {
          ...TypeRef
        }
      }

      fragment InputValue on __InputValue {
        name
        description
        type { ...TypeRef }
        defaultValue
        
        
      }

      fragment TypeRef on __Type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `
      .expectBody((body) => {
        t.assertSnapshot(body.data);
        console.log("schema", body.data.__schema);
      })
      .on(e);
  });
}, { introspection: true });
