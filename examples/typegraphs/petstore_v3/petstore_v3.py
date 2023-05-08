from box import Box
from typegraph import TypeGraph, t
from typegraph.importers.base.importer import Import
from typegraph.importers.openapi import OpenApiImporter
from typegraph.runtimes.http import HTTPRuntime

OpenApiImporter("petstore", url="https://petstore3.swagger.io/api/v3/openapi.json").imp(
    False
)


# Function generated by OpenApiImporter. Do not change.
def import_petstore():
    petstore = HTTPRuntime("https://petstore3.swagger.io/api/v3")

    renames = {
        "Order": "_petstore_1_Order",
        "Customer": "_petstore_2_Customer",
        "Address": "_petstore_3_Address",
        "Category": "_petstore_4_Category",
        "User": "_petstore_5_User",
        "Tag": "_petstore_6_Tag",
        "Pet": "_petstore_7_Pet",
        "ApiResponse": "_petstore_8_ApiResponse",
    }

    types = {}
    types["Order"] = t.struct(
        {
            "id": t.integer().optional(),
            "petId": t.integer().optional(),
            "quantity": t.integer().optional(),
            "shipDate": t.string().optional(),
            "status": t.string().optional(),
            "complete": t.boolean().optional(),
        }
    ).named(renames["Order"])
    types["Customer"] = t.struct(
        {
            "id": t.integer().optional(),
            "username": t.string().optional(),
            "address": t.array(t.proxy(renames["Address"])).optional(),
        }
    ).named(renames["Customer"])
    types["Address"] = t.struct(
        {
            "street": t.string().optional(),
            "city": t.string().optional(),
            "state": t.string().optional(),
            "zip": t.string().optional(),
        }
    ).named(renames["Address"])
    types["Category"] = t.struct(
        {"id": t.integer().optional(), "name": t.string().optional()}
    ).named(renames["Category"])
    types["User"] = t.struct(
        {
            "id": t.integer().optional(),
            "username": t.string().optional(),
            "firstName": t.string().optional(),
            "lastName": t.string().optional(),
            "email": t.string().optional(),
            "password": t.string().optional(),
            "phone": t.string().optional(),
            "userStatus": t.integer().optional(),
        }
    ).named(renames["User"])
    types["Tag"] = t.struct(
        {"id": t.integer().optional(), "name": t.string().optional()}
    ).named(renames["Tag"])
    types["Pet"] = t.struct(
        {
            "id": t.integer().optional(),
            "name": t.string(),
            "category": t.proxy(renames["Category"]).optional(),
            "photoUrls": t.array(t.string()),
            "tags": t.array(t.proxy(renames["Tag"])).optional(),
            "status": t.string().optional(),
        }
    ).named(renames["Pet"])
    types["ApiResponse"] = t.struct(
        {
            "code": t.integer().optional(),
            "type": t.string().optional(),
            "message": t.string().optional(),
        }
    ).named(renames["ApiResponse"])

    functions = {}
    functions["updatePet"] = petstore.put(
        "/pet",
        t.struct(
            {
                "id": t.integer().optional(),
                "name": t.string(),
                "category": t.proxy(renames["Category"]).optional(),
                "photoUrls": t.array(t.string()),
                "tags": t.array(t.proxy(renames["Tag"])).optional(),
                "status": t.string().optional(),
            }
        ),
        t.proxy(renames["Pet"]).optional(),
        content_type="application/json",
        body_fields=("id", "name", "category", "photoUrls", "tags", "status"),
    )
    functions["addPet"] = petstore.post(
        "/pet",
        t.struct(
            {
                "id": t.integer().optional(),
                "name": t.string(),
                "category": t.proxy(renames["Category"]).optional(),
                "photoUrls": t.array(t.string()),
                "tags": t.array(t.proxy(renames["Tag"])).optional(),
                "status": t.string().optional(),
            }
        ),
        t.proxy(renames["Pet"]),
        content_type="application/json",
        body_fields=("id", "name", "category", "photoUrls", "tags", "status"),
    )
    functions["findPetsByStatus"] = petstore.get(
        "/pet/findByStatus",
        t.struct({"status": t.string()}),
        t.array(t.proxy(renames["Pet"])),
    )
    functions["findPetsByTags"] = petstore.get(
        "/pet/findByTags",
        t.struct({"tags": t.array(t.string())}),
        t.array(t.proxy(renames["Pet"])),
    )
    functions["getPetById"] = petstore.get(
        "/pet/{petId}",
        t.struct({"petId": t.integer()}),
        t.proxy(renames["Pet"]).optional(),
    )
    functions["updatePetWithForm"] = petstore.post(
        "/pet/{petId}",
        t.struct({"petId": t.integer(), "name": t.string(), "status": t.string()}),
        t.struct({}),
    )
    functions["deletePet"] = petstore.delete(
        "/pet/{petId}",
        t.struct({"api_key": t.string(), "petId": t.integer()}),
        t.struct({}),
    )
    functions["getInventory"] = petstore.get(
        "/store/inventory",
        t.struct({}),
        t.struct({}),
    )
    functions["placeOrder"] = petstore.post(
        "/store/order",
        t.struct(
            {
                "id": t.integer().optional(),
                "petId": t.integer().optional(),
                "quantity": t.integer().optional(),
                "shipDate": t.string().optional(),
                "status": t.string().optional(),
                "complete": t.boolean().optional(),
            }
        ),
        t.proxy(renames["Order"]),
        content_type="application/json",
        body_fields=("id", "petId", "quantity", "shipDate", "status", "complete"),
    )
    functions["getOrderById"] = petstore.get(
        "/store/order/{orderId}",
        t.struct({"orderId": t.integer()}),
        t.proxy(renames["Order"]).optional(),
    )
    functions["deleteOrder"] = petstore.delete(
        "/store/order/{orderId}",
        t.struct({"orderId": t.integer()}),
        t.struct({}).optional(),
    )
    functions["createUser"] = petstore.post(
        "/user",
        t.struct(
            {
                "id": t.integer().optional(),
                "username": t.string().optional(),
                "firstName": t.string().optional(),
                "lastName": t.string().optional(),
                "email": t.string().optional(),
                "password": t.string().optional(),
                "phone": t.string().optional(),
                "userStatus": t.integer().optional(),
            }
        ),
        t.proxy(renames["User"]),
        content_type="application/json",
        body_fields=(
            "id",
            "username",
            "firstName",
            "lastName",
            "email",
            "password",
            "phone",
            "userStatus",
        ),
    )
    functions["loginUser"] = petstore.get(
        "/user/login",
        t.struct({"username": t.string(), "password": t.string()}),
        t.string(),
    )
    functions["logoutUser"] = petstore.get(
        "/user/logout",
        t.struct({}),
        t.struct({}),
    )
    functions["getUserByName"] = petstore.get(
        "/user/{username}",
        t.struct({"username": t.string()}),
        t.proxy(renames["User"]).optional(),
    )
    functions["deleteUser"] = petstore.delete(
        "/user/{username}",
        t.struct({"username": t.string()}),
        t.struct({}).optional(),
    )

    return Import(
        importer="petstore", renames=renames, types=Box(types), functions=Box(functions)
    )


with TypeGraph(name="petstore-v3") as g:
    pass
