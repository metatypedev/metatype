// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta } from "../utils/mod.ts";

// https://github.com/graphql/graphql-js/blob/main/src/__tests__/starWarsIntrospection-test.ts

Meta.test({
  name: "Basic introspection",
  introspection: true,
}, async (t) => {
  const e = await t.engine("simple/simple.py");

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
              name: "Int",
            },
            {
              name: "NestedNested_Inp",
            },
            {
              name: "inp",
            },
            {
              name: "Query",
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
                name: "Int",
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
                  name: "Int",
                  ofType: null,
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
        __schema: {
          "queryType": {
            "fields": [
              {
                "name": "rec",
                "args": [
                  {
                    "description": "rec argument",
                    "type": {
                      "name": null,
                      "kind": "NON_NULL",
                      "ofType": {
                        "name": "NestedNested_Inp",
                      },
                    },
                  },
                ],
              },
              {
                "name": "test",
                "args": [
                  {
                    "description": "test argument",
                    "type": {
                      "name": null,
                      "kind": "NON_NULL",
                      "ofType": {
                        "name": "Int",
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
      })
      .on(e);
  });
});

Meta.test({
  name: "Full introspection",
  introspection: true,
}, async (t) => {
  const e = await t.engine("simple/simple.py");

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
      .matchOkSnapshot(t)
      .on(e);
  });
});
