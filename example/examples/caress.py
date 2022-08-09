from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers import deno
from typegraph.materializers.prisma import PrismaRuntime
from typegraph.types import typedefs as t


def i18n(internal):
    return t.struct(
        {
            "fr": internal(),
            "en": internal(),
            "de": internal(),
        }
    )


def with_time():
    return {
        "created_at": t.datetime(),
        "updated_at": t.datetime(),
    }


class currency(t.enum):
    def __init__(self) -> None:
        super().__init__(["CHF"])
        self.alias_name = "currency"


class amount(t.unsigned_integer):
    def __init__(self) -> None:
        super().__init__()
        self.alias_name = "amount"


class price(t.struct):
    def __init__(self) -> None:
        super().__init__({"cents": amount(), "currency": currency()})


class vat(t.integer):
    def __init__(self) -> None:
        super().__init__()
        self.alias_name = "vat"


# add generation time
with TypeGraph("caress") as g:

    prisma = PrismaRuntime("postgresql://postgres:password@localhost:5432/db")

    product = (
        t.struct(
            {
                "id": t.uuid().id,  # .s_optional(t.gen(t.uuid(), deno.AutoMaterializer())),
                "slug": t.string(),
                "description": i18n(t.string),
                "name": i18n(t.string),
                "price_public": price(),
                "price_list": price(),
                "price_purchase": price(),
                "price_vat": vat(),
                "disabled_at": t.optional(t.string()),
                "facets": t.struct(
                    {
                        "pet_type": t.list(t.enum(["cat", "dog"])),
                        "medication_types": t.enum(["A", "B"]),
                    }
                ),
                "eans": t.list(t.ean()),
                "images_uri": t.list(t.path()),
                "texts": i18n(
                    lambda: t.struct({"qa": t.string(), "usage": t.string()})
                ),
                "hierarchy": t.string(),
                **with_time(),
                # "hash": t.func(g("Product"), t.string(), deno.AutoMaterializer()),
                "slug_prefix": t.func(
                    g("Product", lambda p: p.slug),
                    t.string(),
                    deno.AutoMaterializer(),
                ),
            }
        )
        .named("Product")
        .s_refine(
            g("Product", lambda p: p.price_public.amount > p.price_purchase.amount)
        )
        .within(prisma)
    )

    # g.expose(**prisma.generate_crud(product))

    user = t.struct({"id": t.uuid().id, **with_time()}).named("user")

    payment_method = t.enum(["PFC"]).named("payment_method")
    gateway = t.literal("datatrans")

    payment = t.struct(
        {
            "id": t.uuid().id,
            "status": t.string(),
            "gateway": gateway,
            "gateway_tx": t.string(),
            "method": payment_method,
            "amount": amount(),
            "order": g("order"),
            "currency": currency(),
            "amount_authorized": amount(),
            "amount_captured": amount().s_optional(),
            "authorized_at": t.datetime(),
            "captured_at": t.datetime().s_optional(),
            "gateway_data": t.json(),
            "user": user,
            "payment_token": g("payment_token"),
            **with_time(),
        }
    ).named("payment")

    payment_token = t.struct(
        {
            "id": t.uuid().id,
            "user": user,
            "gateway": gateway,
            "gateway_token": t.string(),
            "expired_at": t.datetime().s_optional(),
            "method": payment_method,
            "name": t.string(),
            **with_time(),
        }
    ).named("payment_token")

    sub = t.struct(
        {
            "name": t.string(),
            "quantity": t.integer(),
        }
    )
    # implement?

    item_product = t.struct(
        {
            "product": product,
            "kind": t.literal("product"),
            "name": product.name,
            "slug": product.slug,
            "subs": t.list(sub),
            "images": product.images_uri,
            "price_vat": vat(),
            "images_uri": product.images_uri,
            "price_public": product.price_public,
            **sub.of,
        }
    )

    item_shipping = t.struct(
        {
            "kind": t.literal("shippiing"),
            "subs": t.list(sub),
            "price_vat": vat(),
            "price_public": price(),
            **sub.of,
        }
    )

    order = t.struct(
        {
            "id": t.uuid().id,
            "status": t.enum(["waiting_payment"]),
            "items": t.list(t.union([item_product, item_shipping])),
            "user": user,
            "ip": t.ip(),
            **with_time(),
        }
    ).named("order")

    entity = t.struct(
        {
            "id": t.uuid().id,
            "name": t.string(),
            "entity_type": t.string(),
            "entity_owners": t.list(g("entity_owner")),
            "breed": t.string(),
            "gender": t.enum(["female", "male"]),
            "reproductive_status": t.enum(["sterilized", "non-sterilized"]),
            "birth": t.date(),
            "diseases": t.string(),
            "allergies": t.string(),
            "insurer": t.string(),
            "vet": t.string(),
            **with_time(),
        }
    ).named("entity")

    entity_owner = t.struct(
        {
            "entity": entity,
            "user": user,
            "role": t.enum(["admin", "editor"]),
        }
    ).named("entity_owner")

    user_address = t.struct(
        {
            "id": t.uuid().id,
            "user": user,
            "street": t.string(),
            "street_number": t.string(),
            "postal_code": t.string(),
            "locality": t.string(),
            "region": t.string(),
            "country": t.string(),
            "phone": t.string(),
            "firstname": t.string(),
            "lastname": t.string(),
            "company": t.string(),
            **with_time(),
        }
    ).named("user_address")

    upload = t.struct(
        {
            "id": t.uuid().id,
            "user": user,
            "user_path": t.string(),
            "size": t.integer(),
            "type": t.string(),
            "user_last_modified": t.datetime(),
            "bucket": t.string(),
            "ip": t.string(),
            "filename": t.string(),
            **with_time(),
        }
    ).named("upload")

    address = t.struct(
        {
            "id": t.uuid().id,
            "street": t.string(),
            "street_number": t.string(),
            "postal_code": t.string(),
            "locality": t.string(),
            "region": t.string(),
            "country": t.string(),
            "lat": t.float(),
            "lng": t.float(),
        }
    ).named("address")

    biz = t.struct(
        {
            "id": t.uuid().id,
            "name": t.string(),
            "address": address,
            "slug": t.string(),
            "disabled_at": t.datetime().s_optional(),
            "web": t.uri().s_optional(),
            "phones": t.list(t.phone()),
            "emails": t.list(t.email()),
            "sources": t.json(),
            **with_time(),
        }
    ).named("biz")
