from typegraph.graphs.typegraph import TypeGraph
from typegraph.importers.openapi import import_openapi
from typegraph.materializers.http import HTTPRuntime
from typegraph.policies import allow_all
from typegraph.types import types as t

import_openapi("https://petstore3.swagger.io/api/v3/openapi.json", False)

with TypeGraph(name="petstore-v3") as g:
    remote = HTTPRuntime("https://petstore3.swagger.io/api/v3")
    t.struct(
        {
            "id": t.optional(t.integer()),
            "petId": t.optional(t.integer()),
            "quantity": t.optional(t.integer()),
            "shipDate": t.optional(t.string()),
            "status": t.optional(t.string()),
            "complete": t.optional(t.boolean()),
        }
    ).named("Order")
    t.struct(
        {
            "id": t.optional(t.integer()),
            "username": t.optional(t.string()),
            "address": t.optional(t.array(g("Address"))),
        }
    ).named("Customer")
    t.struct(
        {
            "street": t.optional(t.string()),
            "city": t.optional(t.string()),
            "state": t.optional(t.string()),
            "zip": t.optional(t.string()),
        }
    ).named("Address")
    t.struct(
        {
            "id": t.optional(t.integer()),
            "name": t.optional(t.string()),
        }
    ).named("Category")
    t.struct(
        {
            "id": t.optional(t.integer()),
            "username": t.optional(t.string()),
            "firstName": t.optional(t.string()),
            "lastName": t.optional(t.string()),
            "email": t.optional(t.string()),
            "password": t.optional(t.string()),
            "phone": t.optional(t.string()),
            "userStatus": t.optional(t.integer()),
        }
    ).named("User")
    t.struct(
        {
            "id": t.optional(t.integer()),
            "name": t.optional(t.string()),
        }
    ).named("Tag")
    t.struct(
        {
            "id": t.optional(t.integer()),
            "name": t.string(),
            "category": t.optional(g("Category")),
            "photoUrls": t.array(t.string()),
            "tags": t.optional(t.array(g("Tag"))),
            "status": t.optional(t.string()),
        }
    ).named("Pet")
    t.struct(
        {
            "code": t.optional(t.integer()),
            "type": t.optional(t.string()),
            "message": t.optional(t.string()),
        }
    ).named("ApiResponse")
    g.expose(
        updatePet=remote.put("/pet", t.struct({}), t.optional(g("Pet"))).add_policy(
            allow_all()
        ),
        addPet=remote.post("/pet", t.struct({}), g("Pet")).add_policy(allow_all()),
        findPetsByStatus=remote.get(
            "/pet/findByStatus",
            t.struct(
                {
                    "status": t.optional(t.string()),
                }
            ),
            t.array(g("Pet")),
        ).add_policy(allow_all()),
        findPetsByTags=remote.get(
            "/pet/findByTags",
            t.struct(
                {
                    "tags": t.optional(t.array(t.string())),
                }
            ),
            t.array(g("Pet")),
        ).add_policy(allow_all()),
        getPetById=remote.get(
            "/pet/{petId}",
            t.struct(
                {
                    "petId": t.integer(),
                }
            ),
            t.optional(g("Pet")),
        ).add_policy(allow_all()),
        updatePetWithForm=remote.post(
            "/pet/{petId}",
            t.struct(
                {
                    "petId": t.integer(),
                    "name": t.optional(t.string()),
                    "status": t.optional(t.string()),
                }
            ),
            t.struct({}),
        ).add_policy(allow_all()),
        deletePet=remote.delete(
            "/pet/{petId}",
            t.struct(
                {
                    "api_key": t.optional(t.string()),
                    "petId": t.integer(),
                }
            ),
            t.struct({}),
        ).add_policy(allow_all()),
        uploadFile=remote.post(
            "/pet/{petId}/uploadImage",
            t.struct(
                {
                    "petId": t.integer(),
                    "additionalMetadata": t.optional(t.string()),
                }
            ),
            g("ApiResponse"),
        ).add_policy(allow_all()),
        getInventory=remote.get(
            "/store/inventory", t.struct({}), t.struct({})
        ).add_policy(allow_all()),
        placeOrder=remote.post("/store/order", t.struct({}), g("Order")).add_policy(
            allow_all()
        ),
        getOrderById=remote.get(
            "/store/order/{orderId}",
            t.struct(
                {
                    "orderId": t.integer(),
                }
            ),
            t.optional(g("Order")),
        ).add_policy(allow_all()),
        deleteOrder=remote.delete(
            "/store/order/{orderId}",
            t.struct(
                {
                    "orderId": t.integer(),
                }
            ),
            t.optional(t.struct({})),
        ).add_policy(allow_all()),
        createUser=remote.post("/user", t.struct({}), g("User")).add_policy(
            allow_all()
        ),
        createUsersWithListInput=remote.post(
            "/user/createWithList", t.struct({}), t.optional(t.boolean())
        ).add_policy(allow_all()),
        loginUser=remote.get(
            "/user/login",
            t.struct(
                {
                    "username": t.optional(t.string()),
                    "password": t.optional(t.string()),
                }
            ),
            t.string(),
        ).add_policy(allow_all()),
        logoutUser=remote.get(
            "/user/logout", t.struct({}), t.optional(t.boolean())
        ).add_policy(allow_all()),
        getUserByName=remote.get(
            "/user/{username}",
            t.struct(
                {
                    "username": t.string(),
                }
            ),
            t.optional(g("User")),
        ).add_policy(allow_all()),
        updateUser=remote.put(
            "/user/{username}",
            t.struct(
                {
                    "username": t.string(),
                }
            ),
            t.optional(t.boolean()),
        ).add_policy(allow_all()),
        deleteUser=remote.delete(
            "/user/{username}",
            t.struct(
                {
                    "username": t.string(),
                }
            ),
            t.optional(t.struct({})),
        ).add_policy(allow_all()),
    )
