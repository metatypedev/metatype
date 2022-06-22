from typegraph.graphs.typegraph import TypeGraph
from typegraph.importers.openapi import import_openapi
from typegraph.materializers.http import HTTPRuntime
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
