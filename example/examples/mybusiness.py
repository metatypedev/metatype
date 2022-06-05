from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.importers.google_discovery import import_googleapis
from typegraph.materializers import googleapis
from typegraph.types import typedefs as t

discovery = (
    "https://mybusinessbusinessinformation.googleapis.com/$discovery/rest?version=v1"
)
import_googleapis(discovery, False)

with TypeGraph(name="mybusinessbusinessinformation") as g:
    chain_uri_in = t.struct({"uri": t.string()}).named("ChainUriIn")
    chain_uri_out = t.struct({"uri": t.string()}).named("ChainUriOut")
    service_area_business_in = t.struct(
        {"regionCode": t.string(), "places": g("PlacesIn"), "businessType": t.string()}
    ).named("ServiceAreaBusinessIn")
    service_area_business_out = t.struct(
        {"regionCode": t.string(), "places": g("PlacesOut"), "businessType": t.string()}
    ).named("ServiceAreaBusinessOut")
    batch_get_categories_response_in = t.struct(
        {"categories": t.list(g("CategoryIn"))}
    ).named("BatchGetCategoriesResponseIn")
    batch_get_categories_response_out = t.struct(
        {"categories": t.list(g("CategoryOut"))}
    ).named("BatchGetCategoriesResponseOut")
    location_in = t.struct(
        {
            "labels": t.optional(t.list(t.string())),
            "profile": t.optional(g("ProfileIn")),
            "serviceArea": t.optional(g("ServiceAreaBusinessIn")),
            "regularHours": t.optional(g("BusinessHoursIn")),
            "openInfo": t.optional(g("OpenInfoIn")),
            "storefrontAddress": t.optional(g("PostalAddressIn")),
            "languageCode": t.string(),
            "adWordsLocationExtensions": t.optional(g("AdWordsLocationExtensionsIn")),
            "name": t.string(),
            "storeCode": t.optional(t.string()),
            "specialHours": t.optional(g("SpecialHoursIn")),
            "websiteUri": t.optional(t.string()),
            "phoneNumbers": t.optional(g("PhoneNumbersIn")),
            "categories": t.optional(g("CategoriesIn")),
            "title": t.string(),
            "moreHours": t.optional(t.list(g("MoreHoursIn"))),
            "relationshipData": t.optional(g("RelationshipDataIn")),
            "latlng": t.optional(g("LatLngIn")),
            "serviceItems": t.optional(t.list(g("ServiceItemIn"))),
        }
    ).named("LocationIn")
    location_out = t.struct(
        {
            "labels": t.optional(t.list(t.string())),
            "metadata": g("MetadataOut"),
            "profile": t.optional(g("ProfileOut")),
            "serviceArea": t.optional(g("ServiceAreaBusinessOut")),
            "regularHours": t.optional(g("BusinessHoursOut")),
            "openInfo": t.optional(g("OpenInfoOut")),
            "storefrontAddress": t.optional(g("PostalAddressOut")),
            "languageCode": t.string(),
            "adWordsLocationExtensions": t.optional(g("AdWordsLocationExtensionsOut")),
            "name": t.string(),
            "storeCode": t.optional(t.string()),
            "specialHours": t.optional(g("SpecialHoursOut")),
            "websiteUri": t.optional(t.string()),
            "phoneNumbers": t.optional(g("PhoneNumbersOut")),
            "categories": t.optional(g("CategoriesOut")),
            "title": t.string(),
            "moreHours": t.optional(t.list(g("MoreHoursOut"))),
            "relationshipData": t.optional(g("RelationshipDataOut")),
            "latlng": t.optional(g("LatLngOut")),
            "serviceItems": t.optional(t.list(g("ServiceItemOut"))),
        }
    ).named("LocationOut")
    relevant_location_in = t.struct(
        {"relationType": t.string(), "placeId": t.string()}
    ).named("RelevantLocationIn")
    relevant_location_out = t.struct(
        {"relationType": t.string(), "placeId": t.string()}
    ).named("RelevantLocationOut")
    phone_numbers_in = t.struct(
        {"primaryPhone": t.string(), "additionalPhones": t.optional(t.list(t.string()))}
    ).named("PhoneNumbersIn")
    phone_numbers_out = t.struct(
        {"primaryPhone": t.string(), "additionalPhones": t.optional(t.list(t.string()))}
    ).named("PhoneNumbersOut")
    search_google_locations_response_in = t.struct(
        {"googleLocations": t.list(g("GoogleLocationIn"))}
    ).named("SearchGoogleLocationsResponseIn")
    search_google_locations_response_out = t.struct(
        {"googleLocations": t.list(g("GoogleLocationOut"))}
    ).named("SearchGoogleLocationsResponseOut")
    search_google_locations_request_in = t.struct(
        {"location": g("LocationIn"), "query": t.string(), "pageSize": t.integer()}
    ).named("SearchGoogleLocationsRequestIn")
    search_google_locations_request_out = t.struct(
        {"location": g("LocationOut"), "query": t.string(), "pageSize": t.integer()}
    ).named("SearchGoogleLocationsRequestOut")
    free_form_service_item_in = t.struct(
        {"label": g("LabelIn"), "category": t.string()}
    ).named("FreeFormServiceItemIn")
    free_form_service_item_out = t.struct(
        {"label": g("LabelOut"), "category": t.string()}
    ).named("FreeFormServiceItemOut")
    ad_words_location_extensions_in = t.struct({"adPhone": t.string()}).named(
        "AdWordsLocationExtensionsIn"
    )
    ad_words_location_extensions_out = t.struct({"adPhone": t.string()}).named(
        "AdWordsLocationExtensionsOut"
    )
    time_period_in = t.struct(
        {
            "openTime": g("TimeOfDayIn"),
            "closeTime": g("TimeOfDayIn"),
            "openDay": t.string(),
            "closeDay": t.string(),
        }
    ).named("TimePeriodIn")
    time_period_out = t.struct(
        {
            "openTime": g("TimeOfDayOut"),
            "closeTime": g("TimeOfDayOut"),
            "openDay": t.string(),
            "closeDay": t.string(),
        }
    ).named("TimePeriodOut")
    attributes_in = t.struct(
        {"attributes": t.list(g("AttributeIn")), "name": t.string()}
    ).named("AttributesIn")
    attributes_out = t.struct(
        {"attributes": t.list(g("AttributeOut")), "name": t.string()}
    ).named("AttributesOut")
    category_in = t.struct({"name": t.string()}).named("CategoryIn")
    category_out = t.struct(
        {
            "name": t.string(),
            "moreHoursTypes": t.list(g("MoreHoursTypeOut")),
            "displayName": t.string(),
            "serviceTypes": t.list(g("ServiceTypeOut")),
        }
    ).named("CategoryOut")
    relationship_data_in = t.struct(
        {
            "childrenLocations": t.list(g("RelevantLocationIn")),
            "parentChain": t.string(),
            "parentLocation": g("RelevantLocationIn"),
        }
    ).named("RelationshipDataIn")
    relationship_data_out = t.struct(
        {
            "childrenLocations": t.list(g("RelevantLocationOut")),
            "parentChain": t.string(),
            "parentLocation": g("RelevantLocationOut"),
        }
    ).named("RelationshipDataOut")
    more_hours_in = t.struct(
        {"periods": t.list(g("TimePeriodIn")), "hoursTypeId": t.string()}
    ).named("MoreHoursIn")
    more_hours_out = t.struct(
        {"periods": t.list(g("TimePeriodOut")), "hoursTypeId": t.string()}
    ).named("MoreHoursOut")
    time_of_day_in = t.struct(
        {
            "minutes": t.integer(),
            "seconds": t.integer(),
            "hours": t.integer(),
            "nanos": t.integer(),
        }
    ).named("TimeOfDayIn")
    time_of_day_out = t.struct(
        {
            "minutes": t.integer(),
            "seconds": t.integer(),
            "hours": t.integer(),
            "nanos": t.integer(),
        }
    ).named("TimeOfDayOut")
    list_categories_response_in = t.struct(
        {"categories": t.list(g("CategoryIn")), "nextPageToken": t.string()}
    ).named("ListCategoriesResponseIn")
    list_categories_response_out = t.struct(
        {"categories": t.list(g("CategoryOut")), "nextPageToken": t.string()}
    ).named("ListCategoriesResponseOut")
    place_info_in = t.struct({"placeId": t.string(), "placeName": t.string()}).named(
        "PlaceInfoIn"
    )
    place_info_out = t.struct({"placeId": t.string(), "placeName": t.string()}).named(
        "PlaceInfoOut"
    )
    metadata_in = t.struct({"_": t.optional(t.Type())}).named("MetadataIn")
    metadata_out = t.struct(
        {
            "duplicateLocation": t.string(),
            "hasVoiceOfMerchant": t.boolean(),
            "canDelete": t.boolean(),
            "canOperateLocalPost": t.boolean(),
            "newReviewUri": t.string(),
            "placeId": t.string(),
            "canOperateLodgingData": t.boolean(),
            "canHaveFoodMenus": t.boolean(),
            "mapsUri": t.string(),
            "hasGoogleUpdated": t.boolean(),
            "canOperateHealthData": t.boolean(),
            "hasPendingEdits": t.boolean(),
            "canHaveBusinessCalls": t.boolean(),
            "canModifyServiceList": t.boolean(),
        }
    ).named("MetadataOut")
    service_item_in = t.struct(
        {
            "freeFormServiceItem": t.optional(g("FreeFormServiceItemIn")),
            "price": t.optional(g("MoneyIn")),
            "structuredServiceItem": t.optional(g("StructuredServiceItemIn")),
        }
    ).named("ServiceItemIn")
    service_item_out = t.struct(
        {
            "freeFormServiceItem": t.optional(g("FreeFormServiceItemOut")),
            "price": t.optional(g("MoneyOut")),
            "structuredServiceItem": t.optional(g("StructuredServiceItemOut")),
        }
    ).named("ServiceItemOut")
    google_location_in = t.struct(
        {
            "requestAdminRightsUri": t.string(),
            "location": g("LocationIn"),
            "name": t.string(),
        }
    ).named("GoogleLocationIn")
    google_location_out = t.struct(
        {
            "requestAdminRightsUri": t.string(),
            "location": g("LocationOut"),
            "name": t.string(),
        }
    ).named("GoogleLocationOut")
    open_info_in = t.struct(
        {"openingDate": t.optional(g("DateIn")), "status": t.string()}
    ).named("OpenInfoIn")
    open_info_out = t.struct(
        {
            "canReopen": t.boolean(),
            "openingDate": t.optional(g("DateOut")),
            "status": t.string(),
        }
    ).named("OpenInfoOut")
    clear_location_association_request_in = t.struct({"_": t.optional(t.Type())}).named(
        "ClearLocationAssociationRequestIn"
    )
    clear_location_association_request_out = t.struct(
        {"_": t.optional(t.Type())}
    ).named("ClearLocationAssociationRequestOut")
    list_attribute_metadata_response_in = t.struct(
        {
            "attributeMetadata": t.list(g("AttributeMetadataIn")),
            "nextPageToken": t.string(),
        }
    ).named("ListAttributeMetadataResponseIn")
    list_attribute_metadata_response_out = t.struct(
        {
            "attributeMetadata": t.list(g("AttributeMetadataOut")),
            "nextPageToken": t.string(),
        }
    ).named("ListAttributeMetadataResponseOut")
    service_type_in = t.struct({"_": t.optional(t.Type())}).named("ServiceTypeIn")
    service_type_out = t.struct(
        {"serviceTypeId": t.string(), "displayName": t.string()}
    ).named("ServiceTypeOut")
    special_hours_in = t.struct(
        {"specialHourPeriods": t.list(g("SpecialHourPeriodIn"))}
    ).named("SpecialHoursIn")
    special_hours_out = t.struct(
        {"specialHourPeriods": t.list(g("SpecialHourPeriodOut"))}
    ).named("SpecialHoursOut")
    postal_address_in = t.struct(
        {
            "languageCode": t.optional(t.string()),
            "organization": t.optional(t.string()),
            "sublocality": t.optional(t.string()),
            "postalCode": t.optional(t.string()),
            "administrativeArea": t.optional(t.string()),
            "recipients": t.optional(t.list(t.string())),
            "locality": t.optional(t.string()),
            "revision": t.integer(),
            "regionCode": t.string(),
            "sortingCode": t.optional(t.string()),
            "addressLines": t.list(t.string()),
        }
    ).named("PostalAddressIn")
    postal_address_out = t.struct(
        {
            "languageCode": t.optional(t.string()),
            "organization": t.optional(t.string()),
            "sublocality": t.optional(t.string()),
            "postalCode": t.optional(t.string()),
            "administrativeArea": t.optional(t.string()),
            "recipients": t.optional(t.list(t.string())),
            "locality": t.optional(t.string()),
            "revision": t.integer(),
            "regionCode": t.string(),
            "sortingCode": t.optional(t.string()),
            "addressLines": t.list(t.string()),
        }
    ).named("PostalAddressOut")
    more_hours_type_in = t.struct({"_": t.optional(t.Type())}).named("MoreHoursTypeIn")
    more_hours_type_out = t.struct(
        {
            "hoursTypeId": t.string(),
            "localizedDisplayName": t.string(),
            "displayName": t.string(),
        }
    ).named("MoreHoursTypeOut")
    list_locations_response_in = t.struct(
        {
            "totalSize": t.integer(),
            "locations": t.list(g("LocationIn")),
            "nextPageToken": t.string(),
        }
    ).named("ListLocationsResponseIn")
    list_locations_response_out = t.struct(
        {
            "totalSize": t.integer(),
            "locations": t.list(g("LocationOut")),
            "nextPageToken": t.string(),
        }
    ).named("ListLocationsResponseOut")
    structured_service_item_in = t.struct(
        {"serviceTypeId": t.string(), "description": t.optional(t.string())}
    ).named("StructuredServiceItemIn")
    structured_service_item_out = t.struct(
        {"serviceTypeId": t.string(), "description": t.optional(t.string())}
    ).named("StructuredServiceItemOut")
    attribute_metadata_in = t.struct(
        {
            "valueMetadata": t.list(g("AttributeValueMetadataIn")),
            "parent": t.string(),
            "groupDisplayName": t.string(),
            "displayName": t.string(),
            "valueType": t.string(),
            "deprecated": t.boolean(),
            "repeatable": t.boolean(),
        }
    ).named("AttributeMetadataIn")
    attribute_metadata_out = t.struct(
        {
            "valueMetadata": t.list(g("AttributeValueMetadataOut")),
            "parent": t.string(),
            "groupDisplayName": t.string(),
            "displayName": t.string(),
            "valueType": t.string(),
            "deprecated": t.boolean(),
            "repeatable": t.boolean(),
        }
    ).named("AttributeMetadataOut")
    profile_in = t.struct({"description": t.string()}).named("ProfileIn")
    profile_out = t.struct({"description": t.string()}).named("ProfileOut")
    special_hour_period_in = t.struct(
        {
            "endDate": t.optional(g("DateIn")),
            "closeTime": t.optional(g("TimeOfDayIn")),
            "openTime": t.optional(g("TimeOfDayIn")),
            "closed": t.optional(t.boolean()),
            "startDate": g("DateIn"),
        }
    ).named("SpecialHourPeriodIn")
    special_hour_period_out = t.struct(
        {
            "endDate": t.optional(g("DateOut")),
            "closeTime": t.optional(g("TimeOfDayOut")),
            "openTime": t.optional(g("TimeOfDayOut")),
            "closed": t.optional(t.boolean()),
            "startDate": g("DateOut"),
        }
    ).named("SpecialHourPeriodOut")
    lat_lng_in = t.struct({"longitude": t.float(), "latitude": t.float()}).named(
        "LatLngIn"
    )
    lat_lng_out = t.struct({"longitude": t.float(), "latitude": t.float()}).named(
        "LatLngOut"
    )
    categories_in = t.struct(
        {
            "primaryCategory": g("CategoryIn"),
            "additionalCategories": t.optional(t.list(g("CategoryIn"))),
        }
    ).named("CategoriesIn")
    categories_out = t.struct(
        {
            "primaryCategory": g("CategoryOut"),
            "additionalCategories": t.optional(t.list(g("CategoryOut"))),
        }
    ).named("CategoriesOut")
    chain_name_in = t.struct(
        {"displayName": t.string(), "languageCode": t.string()}
    ).named("ChainNameIn")
    chain_name_out = t.struct(
        {"displayName": t.string(), "languageCode": t.string()}
    ).named("ChainNameOut")
    business_hours_in = t.struct({"periods": t.list(g("TimePeriodIn"))}).named(
        "BusinessHoursIn"
    )
    business_hours_out = t.struct({"periods": t.list(g("TimePeriodOut"))}).named(
        "BusinessHoursOut"
    )
    places_in = t.struct({"placeInfos": t.list(g("PlaceInfoIn"))}).named("PlacesIn")
    places_out = t.struct({"placeInfos": t.list(g("PlaceInfoOut"))}).named("PlacesOut")
    repeated_enum_attribute_value_in = t.struct(
        {"unsetValues": t.list(t.string()), "setValues": t.list(t.string())}
    ).named("RepeatedEnumAttributeValueIn")
    repeated_enum_attribute_value_out = t.struct(
        {"unsetValues": t.list(t.string()), "setValues": t.list(t.string())}
    ).named("RepeatedEnumAttributeValueOut")
    chain_in = t.struct(
        {
            "chainNames": t.list(g("ChainNameIn")),
            "websites": t.list(g("ChainUriIn")),
            "name": t.string(),
            "locationCount": t.integer(),
        }
    ).named("ChainIn")
    chain_out = t.struct(
        {
            "chainNames": t.list(g("ChainNameOut")),
            "websites": t.list(g("ChainUriOut")),
            "name": t.string(),
            "locationCount": t.integer(),
        }
    ).named("ChainOut")
    attribute_in = t.struct(
        {
            "values": t.list(t.Type()),
            "name": t.string(),
            "uriValues": t.list(g("UriAttributeValueIn")),
            "repeatedEnumValue": g("RepeatedEnumAttributeValueIn"),
        }
    ).named("AttributeIn")
    attribute_out = t.struct(
        {
            "values": t.list(t.Type()),
            "valueType": t.string(),
            "name": t.string(),
            "uriValues": t.list(g("UriAttributeValueOut")),
            "repeatedEnumValue": g("RepeatedEnumAttributeValueOut"),
        }
    ).named("AttributeOut")
    empty_in = t.struct({"_": t.optional(t.Type())}).named("EmptyIn")
    empty_out = t.struct({"_": t.optional(t.Type())}).named("EmptyOut")
    label_in = t.struct(
        {
            "languageCode": t.optional(t.string()),
            "description": t.optional(t.string()),
            "displayName": t.string(),
        }
    ).named("LabelIn")
    label_out = t.struct(
        {
            "languageCode": t.optional(t.string()),
            "description": t.optional(t.string()),
            "displayName": t.string(),
        }
    ).named("LabelOut")
    date_in = t.struct(
        {"year": t.integer(), "month": t.integer(), "day": t.integer()}
    ).named("DateIn")
    date_out = t.struct(
        {"year": t.integer(), "month": t.integer(), "day": t.integer()}
    ).named("DateOut")
    uri_attribute_value_in = t.struct({"uri": t.string()}).named("UriAttributeValueIn")
    uri_attribute_value_out = t.struct({"uri": t.string()}).named(
        "UriAttributeValueOut"
    )
    google_updated_location_in = t.struct(
        {"diffMask": t.string(), "location": g("LocationIn"), "pendingMask": t.string()}
    ).named("GoogleUpdatedLocationIn")
    google_updated_location_out = t.struct(
        {
            "diffMask": t.string(),
            "location": g("LocationOut"),
            "pendingMask": t.string(),
        }
    ).named("GoogleUpdatedLocationOut")
    money_in = t.struct(
        {"nanos": t.integer(), "currencyCode": t.string(), "units": t.string()}
    ).named("MoneyIn")
    money_out = t.struct(
        {"nanos": t.integer(), "currencyCode": t.string(), "units": t.string()}
    ).named("MoneyOut")
    search_chains_response_in = t.struct({"chains": t.list(g("ChainIn"))}).named(
        "SearchChainsResponseIn"
    )
    search_chains_response_out = t.struct({"chains": t.list(g("ChainOut"))}).named(
        "SearchChainsResponseOut"
    )
    associate_location_request_in = t.struct({"placeId": t.string()}).named(
        "AssociateLocationRequestIn"
    )
    associate_location_request_out = t.struct({"placeId": t.string()}).named(
        "AssociateLocationRequestOut"
    )
    attribute_value_metadata_in = t.struct(
        {"displayName": t.string(), "value": t.Type()}
    ).named("AttributeValueMetadataIn")
    attribute_value_metadata_out = t.struct(
        {"displayName": t.string(), "value": t.Type()}
    ).named("AttributeValueMetadataOut")
    g.expose(
        attributesList=t.func(
            t.struct(
                {
                    "pageSize": t.integer(),
                    "showAll": t.boolean(),
                    "pageToken": t.string(),
                    "parent": t.string(),
                    "categoryName": t.string(),
                    "languageCode": t.string(),
                    "regionCode": t.string(),
                }
            ),
            g("ListAttributeMetadataResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/attributes",
            ),
        ).named("mybusinessbusinessinformation.attributes.list"),
        categoriesBatchGet=t.func(
            t.struct(
                {
                    "view": t.string(),
                    "names": t.string(),
                    "languageCode": t.string(),
                    "regionCode": t.optional(t.string()),
                }
            ),
            g("BatchGetCategoriesResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/categories:batchGet",
            ),
        ).named("mybusinessbusinessinformation.categories.batchGet"),
        categoriesList=t.func(
            t.struct(
                {
                    "filter": t.optional(t.string()),
                    "view": t.string(),
                    "pageSize": t.optional(t.integer()),
                    "pageToken": t.optional(t.string()),
                    "languageCode": t.string(),
                    "regionCode": t.string(),
                }
            ),
            g("ListCategoriesResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/categories",
            ),
        ).named("mybusinessbusinessinformation.categories.list"),
        accountsLocationsCreate=t.func(
            t.struct(
                {
                    "parent": t.string(),
                    "validateOnly": t.optional(t.boolean()),
                    "requestId": t.optional(t.string()),
                }
            ),
            g("LocationOut"),
            googleapis.RestMat(
                "POST",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+parent}/locations",
            ),
        ).named("mybusinessbusinessinformation.accounts.locations.create"),
        accountsLocationsList=t.func(
            t.struct(
                {
                    "pageToken": t.optional(t.string()),
                    "orderBy": t.optional(t.string()),
                    "filter": t.optional(t.string()),
                    "pageSize": t.optional(t.integer()),
                    "parent": t.string(),
                }
            ),
            g("ListLocationsResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+parent}/locations",
            ),
        )
        .named("mybusinessbusinessinformation.accounts.locations.list")
        .add_policy(policies.allow_all()),
        locationsPatch=t.func(
            t.struct(
                {
                    "validateOnly": t.optional(t.boolean()),
                    "name": t.string(),
                    "updateMask": t.string(),
                }
            ),
            g("LocationOut"),
            googleapis.RestMat(
                "PATCH",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}",
            ),
        ).named("mybusinessbusinessinformation.locations.patch"),
        locationsGetAttributes=t.func(
            t.struct(
                {
                    "name": t.string(),
                }
            ),
            g("AttributesOut"),
            googleapis.RestMat(
                "GET", "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}"
            ),
        ).named("mybusinessbusinessinformation.locations.getAttributes"),
        locationsGet=t.func(
            t.struct(
                {
                    "name": t.string(),
                }
            ),
            g("LocationOut"),
            googleapis.RestMat(
                "GET", "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}"
            ),
        )
        .named("mybusinessbusinessinformation.locations.get")
        .add_policy(policies.allow_all()),
        locationsDelete=t.func(
            t.struct(
                {
                    "name": t.string(),
                }
            ),
            g("EmptyOut"),
            googleapis.RestMat(
                "DELETE",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}",
            ),
        ).named("mybusinessbusinessinformation.locations.delete"),
        locationsClearLocationAssociation=t.func(
            t.struct(
                {
                    "name": t.string(),
                }
            ),
            g("EmptyOut"),
            googleapis.RestMat(
                "POST",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}:clearLocationAssociation",
            ),
        ).named("mybusinessbusinessinformation.locations.clearLocationAssociation"),
        locationsUpdateAttributes=t.func(
            t.struct(
                {
                    "name": t.string(),
                    "attributeMask": t.string(),
                }
            ),
            g("AttributesOut"),
            googleapis.RestMat(
                "PATCH",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}",
            ),
        ).named("mybusinessbusinessinformation.locations.updateAttributes"),
        locationsGetGoogleUpdated=t.func(
            t.struct(
                {
                    "name": t.string(),
                }
            ),
            g("GoogleUpdatedLocationOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}:getGoogleUpdated",
            ),
        ).named("mybusinessbusinessinformation.locations.getGoogleUpdated"),
        locationsAssociate=t.func(
            t.struct(
                {
                    "name": t.string(),
                }
            ),
            g("EmptyOut"),
            googleapis.RestMat(
                "POST",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}:associate",
            ),
        ).named("mybusinessbusinessinformation.locations.associate"),
        locationsAttributesGetGoogleUpdated=t.func(
            t.struct(
                {
                    "name": t.string(),
                }
            ),
            g("AttributesOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}:getGoogleUpdated",
            ),
        ).named("mybusinessbusinessinformation.locations.attributes.getGoogleUpdated"),
        chainsSearch=t.func(
            t.struct(
                {
                    "pageSize": t.integer(),
                    "chainName": t.string(),
                }
            ),
            g("SearchChainsResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/chains:search",
            ),
        ).named("mybusinessbusinessinformation.chains.search"),
        chainsGet=t.func(
            t.struct(
                {
                    "name": t.string(),
                }
            ),
            g("ChainOut"),
            googleapis.RestMat(
                "GET", "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}"
            ),
        ).named("mybusinessbusinessinformation.chains.get"),
        googleLocationsSearch=t.func(
            t.struct({}),
            g("SearchGoogleLocationsResponseOut"),
            googleapis.RestMat(
                "POST",
                "https://mybusinessbusinessinformation.googleapis.com/v1/googleLocations:search",
            ),
        ).named("mybusinessbusinessinformation.googleLocations.search"),
    )
