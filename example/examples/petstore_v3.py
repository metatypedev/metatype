from typegraph.graphs.typegraph import TypeGraph
from typegraph.importers.openapi import import_openapi
from typegraph.materializers.http import HTTPRuntime
from typegraph.policies import allow_all
from typegraph.types import typedefs as t

import_openapi("https://petstore3.swagger.io/api/v3/openapi.json", False)

with TypeGraph(name="petstore-v3") as g:
    remote = HTTPRuntime("https://petstore3.swagger.io/api/v3")
    t.struct(
        {
            "id": t.integer(),
            "petId": t.integer(),
            "quantity": t.integer(),
            "shipDate": t.string(),
            "status": t.string(),
            "complete": t.boolean(),
        }
    ).named("Order")
    t.struct(
        {
            "id": t.integer(),
            "username": t.string(),
            "address": t.list(g("Address")),
        }
    ).named("Customer")
    t.struct(
        {
            "street": t.string(),
            "city": t.string(),
            "state": t.string(),
            "zip": t.string(),
        }
    ).named("Address")
    t.struct(
        {
            "id": t.integer(),
            "name": t.string(),
        }
    ).named("Category")
    t.struct(
        {
            "id": t.integer(),
            "username": t.string(),
            "firstName": t.string(),
            "lastName": t.string(),
            "email": t.string(),
            "password": t.string(),
            "phone": t.string(),
            "userStatus": t.integer(),
        }
    ).named("User")
    t.struct(
        {
            "id": t.integer(),
            "name": t.string(),
        }
    ).named("Tag")
    t.struct(
        {
            "id": t.integer(),
            "name": t.string(),
            "category": g("Category"),
            "photoUrls": t.list(t.string()),
            "tags": t.list(g("Tag")),
            "status": t.string(),
        }
    ).named("Pet")
    t.struct(
        {
            "code": t.integer(),
            "type": t.string(),
            "message": t.string(),
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
                    "status": t.string(),
                }
            ),
            t.list(g("Pet")),
        ).add_policy(allow_all()),
        findPetsByTags=remote.get(
            "/pet/findByTags",
            t.struct(
                {
                    "tags": t.list(t.string()),
                }
            ),
            t.list(g("Pet")),
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
                    "name": t.string(),
                    "status": t.string(),
                }
            ),
            t.struct({}),
        ).add_policy(allow_all()),
        deletePet=remote.delete(
            "/pet/{petId}",
            t.struct(
                {
                    "api_key": t.string(),
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
                    "additionalMetadata": t.string(),
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
                    "username": t.string(),
                    "password": t.string(),
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
