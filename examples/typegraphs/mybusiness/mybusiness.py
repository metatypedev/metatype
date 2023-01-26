from typegraph import Effect
from typegraph import t
from typegraph import TypeGraph
from typegraph.importers.google_discovery import import_googleapis
from typegraph.providers.google.runtimes import googleapis

discovery = (
    "https://mybusinessbusinessinformation.googleapis.com/$discovery/rest?version=v1"
)
import_googleapis(discovery, False)

with TypeGraph(name="mybusinessbusinessinformation") as g:
    empty_in = t.struct({"_": t.optional(t.any())}).named("EmptyIn")
    empty_out = t.struct({"_": t.optional(t.any())}).named("EmptyOut")
    lat_lng_in = t.struct({"latitude": t.float(), "longitude": t.float()}).named(
        "LatLngIn"
    )
    lat_lng_out = t.struct({"latitude": t.float(), "longitude": t.float()}).named(
        "LatLngOut"
    )
    category_in = t.struct({"name": t.string()}).named("CategoryIn")
    category_out = t.struct(
        {
            "name": t.string(),
            "serviceTypes": t.array(g("ServiceTypeOut")),
            "moreHoursTypes": t.array(g("MoreHoursTypeOut")),
            "displayName": t.string(),
        }
    ).named("CategoryOut")
    postal_address_in = t.struct(
        {
            "organization": t.optional(t.string()),
            "administrativeArea": t.optional(t.string()),
            "revision": t.integer(),
            "languageCode": t.optional(t.string()),
            "recipients": t.optional(t.array(t.string())),
            "locality": t.optional(t.string()),
            "sublocality": t.optional(t.string()),
            "postalCode": t.optional(t.string()),
            "addressLines": t.array(t.string()),
            "regionCode": t.string(),
            "sortingCode": t.optional(t.string()),
        }
    ).named("PostalAddressIn")
    postal_address_out = t.struct(
        {
            "organization": t.optional(t.string()),
            "administrativeArea": t.optional(t.string()),
            "revision": t.integer(),
            "languageCode": t.optional(t.string()),
            "recipients": t.optional(t.array(t.string())),
            "locality": t.optional(t.string()),
            "sublocality": t.optional(t.string()),
            "postalCode": t.optional(t.string()),
            "addressLines": t.array(t.string()),
            "regionCode": t.string(),
            "sortingCode": t.optional(t.string()),
        }
    ).named("PostalAddressOut")
    business_hours_in = t.struct({"periods": t.array(g("TimePeriodIn"))}).named(
        "BusinessHoursIn"
    )
    business_hours_out = t.struct({"periods": t.array(g("TimePeriodOut"))}).named(
        "BusinessHoursOut"
    )
    service_area_business_in = t.struct(
        {"regionCode": t.string(), "businessType": t.string(), "places": g("PlacesIn")}
    ).named("ServiceAreaBusinessIn")
    service_area_business_out = t.struct(
        {"regionCode": t.string(), "businessType": t.string(), "places": g("PlacesOut")}
    ).named("ServiceAreaBusinessOut")
    more_hours_in = t.struct(
        {"periods": t.array(g("TimePeriodIn")), "hoursTypeId": t.string()}
    ).named("MoreHoursIn")
    more_hours_out = t.struct(
        {"periods": t.array(g("TimePeriodOut")), "hoursTypeId": t.string()}
    ).named("MoreHoursOut")
    google_updated_location_in = t.struct(
        {"location": g("LocationIn"), "pendingMask": t.string(), "diffMask": t.string()}
    ).named("GoogleUpdatedLocationIn")
    google_updated_location_out = t.struct(
        {
            "location": g("LocationOut"),
            "pendingMask": t.string(),
            "diffMask": t.string(),
        }
    ).named("GoogleUpdatedLocationOut")
    open_info_in = t.struct(
        {"status": t.string(), "openingDate": t.optional(g("DateIn"))}
    ).named("OpenInfoIn")
    open_info_out = t.struct(
        {
            "canReopen": t.boolean(),
            "status": t.string(),
            "openingDate": t.optional(g("DateOut")),
        }
    ).named("OpenInfoOut")
    phone_numbers_in = t.struct(
        {
            "primaryPhone": t.string(),
            "additionalPhones": t.optional(t.array(t.string())),
        }
    ).named("PhoneNumbersIn")
    phone_numbers_out = t.struct(
        {
            "primaryPhone": t.string(),
            "additionalPhones": t.optional(t.array(t.string())),
        }
    ).named("PhoneNumbersOut")
    associate_location_request_in = t.struct({"placeId": t.string()}).named(
        "AssociateLocationRequestIn"
    )
    associate_location_request_out = t.struct({"placeId": t.string()}).named(
        "AssociateLocationRequestOut"
    )
    special_hours_in = t.struct(
        {"specialHourPeriods": t.array(g("SpecialHourPeriodIn"))}
    ).named("SpecialHoursIn")
    special_hours_out = t.struct(
        {"specialHourPeriods": t.array(g("SpecialHourPeriodOut"))}
    ).named("SpecialHoursOut")
    money_in = t.struct(
        {"nanos": t.integer(), "currencyCode": t.string(), "units": t.string()}
    ).named("MoneyIn")
    money_out = t.struct(
        {"nanos": t.integer(), "currencyCode": t.string(), "units": t.string()}
    ).named("MoneyOut")
    repeated_enum_attribute_value_in = t.struct(
        {"setValues": t.array(t.string()), "unsetValues": t.array(t.string())}
    ).named("RepeatedEnumAttributeValueIn")
    repeated_enum_attribute_value_out = t.struct(
        {"setValues": t.array(t.string()), "unsetValues": t.array(t.string())}
    ).named("RepeatedEnumAttributeValueOut")
    attributes_in = t.struct(
        {"attributes": t.array(g("AttributeIn")), "name": t.string()}
    ).named("AttributesIn")
    attributes_out = t.struct(
        {"attributes": t.array(g("AttributeOut")), "name": t.string()}
    ).named("AttributesOut")
    search_chains_response_in = t.struct({"chains": t.array(g("ChainIn"))}).named(
        "SearchChainsResponseIn"
    )
    search_chains_response_out = t.struct({"chains": t.array(g("ChainOut"))}).named(
        "SearchChainsResponseOut"
    )
    list_attribute_metadata_response_in = t.struct(
        {
            "nextPageToken": t.string(),
            "attributeMetadata": t.array(g("AttributeMetadataIn")),
        }
    ).named("ListAttributeMetadataResponseIn")
    list_attribute_metadata_response_out = t.struct(
        {
            "nextPageToken": t.string(),
            "attributeMetadata": t.array(g("AttributeMetadataOut")),
        }
    ).named("ListAttributeMetadataResponseOut")
    search_google_locations_request_in = t.struct(
        {"query": t.string(), "pageSize": t.integer(), "location": g("LocationIn")}
    ).named("SearchGoogleLocationsRequestIn")
    search_google_locations_request_out = t.struct(
        {"query": t.string(), "pageSize": t.integer(), "location": g("LocationOut")}
    ).named("SearchGoogleLocationsRequestOut")
    place_info_in = t.struct({"placeId": t.string(), "placeName": t.string()}).named(
        "PlaceInfoIn"
    )
    place_info_out = t.struct({"placeId": t.string(), "placeName": t.string()}).named(
        "PlaceInfoOut"
    )
    time_period_in = t.struct(
        {
            "closeTime": g("TimeOfDayIn"),
            "closeDay": t.string(),
            "openTime": g("TimeOfDayIn"),
            "openDay": t.string(),
        }
    ).named("TimePeriodIn")
    time_period_out = t.struct(
        {
            "closeTime": g("TimeOfDayOut"),
            "closeDay": t.string(),
            "openTime": g("TimeOfDayOut"),
            "openDay": t.string(),
        }
    ).named("TimePeriodOut")
    chain_uri_in = t.struct({"uri": t.string()}).named("ChainUriIn")
    chain_uri_out = t.struct({"uri": t.string()}).named("ChainUriOut")
    list_locations_response_in = t.struct(
        {
            "totalSize": t.integer(),
            "locations": t.array(g("LocationIn")),
            "nextPageToken": t.string(),
        }
    ).named("ListLocationsResponseIn")
    list_locations_response_out = t.struct(
        {
            "totalSize": t.integer(),
            "locations": t.array(g("LocationOut")),
            "nextPageToken": t.string(),
        }
    ).named("ListLocationsResponseOut")
    relationship_data_in = t.struct(
        {
            "parentLocation": g("RelevantLocationIn"),
            "childrenLocations": t.array(g("RelevantLocationIn")),
            "parentChain": t.string(),
        }
    ).named("RelationshipDataIn")
    relationship_data_out = t.struct(
        {
            "parentLocation": g("RelevantLocationOut"),
            "childrenLocations": t.array(g("RelevantLocationOut")),
            "parentChain": t.string(),
        }
    ).named("RelationshipDataOut")
    attribute_value_metadata_in = t.struct(
        {"value": t.any(), "displayName": t.string()}
    ).named("AttributeValueMetadataIn")
    attribute_value_metadata_out = t.struct(
        {"value": t.any(), "displayName": t.string()}
    ).named("AttributeValueMetadataOut")
    google_location_in = t.struct(
        {
            "location": g("LocationIn"),
            "requestAdminRightsUri": t.string(),
            "name": t.string(),
        }
    ).named("GoogleLocationIn")
    google_location_out = t.struct(
        {
            "location": g("LocationOut"),
            "requestAdminRightsUri": t.string(),
            "name": t.string(),
        }
    ).named("GoogleLocationOut")
    uri_attribute_value_in = t.struct({"uri": t.string()}).named("UriAttributeValueIn")
    uri_attribute_value_out = t.struct({"uri": t.string()}).named(
        "UriAttributeValueOut"
    )
    special_hour_period_in = t.struct(
        {
            "openTime": t.optional(g("TimeOfDayIn")),
            "closeTime": t.optional(g("TimeOfDayIn")),
            "closed": t.optional(t.boolean()),
            "startDate": g("DateIn"),
            "endDate": t.optional(g("DateIn")),
        }
    ).named("SpecialHourPeriodIn")
    special_hour_period_out = t.struct(
        {
            "openTime": t.optional(g("TimeOfDayOut")),
            "closeTime": t.optional(g("TimeOfDayOut")),
            "closed": t.optional(t.boolean()),
            "startDate": g("DateOut"),
            "endDate": t.optional(g("DateOut")),
        }
    ).named("SpecialHourPeriodOut")
    relevant_location_in = t.struct(
        {"relationType": t.string(), "placeId": t.string()}
    ).named("RelevantLocationIn")
    relevant_location_out = t.struct(
        {"relationType": t.string(), "placeId": t.string()}
    ).named("RelevantLocationOut")
    time_of_day_in = t.struct(
        {
            "seconds": t.integer(),
            "hours": t.integer(),
            "minutes": t.integer(),
            "nanos": t.integer(),
        }
    ).named("TimeOfDayIn")
    time_of_day_out = t.struct(
        {
            "seconds": t.integer(),
            "hours": t.integer(),
            "minutes": t.integer(),
            "nanos": t.integer(),
        }
    ).named("TimeOfDayOut")
    date_in = t.struct(
        {"day": t.integer(), "year": t.integer(), "month": t.integer()}
    ).named("DateIn")
    date_out = t.struct(
        {"day": t.integer(), "year": t.integer(), "month": t.integer()}
    ).named("DateOut")
    free_form_service_item_in = t.struct(
        {"category": t.string(), "label": g("LabelIn")}
    ).named("FreeFormServiceItemIn")
    free_form_service_item_out = t.struct(
        {"category": t.string(), "label": g("LabelOut")}
    ).named("FreeFormServiceItemOut")
    chain_name_in = t.struct(
        {"displayName": t.string(), "languageCode": t.string()}
    ).named("ChainNameIn")
    chain_name_out = t.struct(
        {"displayName": t.string(), "languageCode": t.string()}
    ).named("ChainNameOut")
    attribute_metadata_in = t.struct(
        {
            "deprecated": t.boolean(),
            "repeatable": t.boolean(),
            "displayName": t.string(),
            "valueMetadata": t.array(g("AttributeValueMetadataIn")),
            "parent": t.string(),
            "valueType": t.string(),
            "groupDisplayName": t.string(),
        }
    ).named("AttributeMetadataIn")
    attribute_metadata_out = t.struct(
        {
            "deprecated": t.boolean(),
            "repeatable": t.boolean(),
            "displayName": t.string(),
            "valueMetadata": t.array(g("AttributeValueMetadataOut")),
            "parent": t.string(),
            "valueType": t.string(),
            "groupDisplayName": t.string(),
        }
    ).named("AttributeMetadataOut")
    places_in = t.struct({"placeInfos": t.array(g("PlaceInfoIn"))}).named("PlacesIn")
    places_out = t.struct({"placeInfos": t.array(g("PlaceInfoOut"))}).named("PlacesOut")
    structured_service_item_in = t.struct(
        {"serviceTypeId": t.string(), "description": t.optional(t.string())}
    ).named("StructuredServiceItemIn")
    structured_service_item_out = t.struct(
        {"serviceTypeId": t.string(), "description": t.optional(t.string())}
    ).named("StructuredServiceItemOut")
    metadata_in = t.struct({"_": t.optional(t.any())}).named("MetadataIn")
    metadata_out = t.struct(
        {
            "canModifyServiceList": t.boolean(),
            "mapsUri": t.string(),
            "canHaveFoodMenus": t.boolean(),
            "canDelete": t.boolean(),
            "canOperateLodgingData": t.boolean(),
            "hasGoogleUpdated": t.boolean(),
            "hasVoiceOfMerchant": t.boolean(),
            "placeId": t.string(),
            "hasPendingEdits": t.boolean(),
            "canOperateHealthData": t.boolean(),
            "newReviewUri": t.string(),
            "duplicateLocation": t.string(),
            "canOperateLocalPost": t.boolean(),
            "canHaveBusinessCalls": t.boolean(),
        }
    ).named("MetadataOut")
    location_in = t.struct(
        {
            "adWordsLocationExtensions": t.optional(g("AdWordsLocationExtensionsIn")),
            "openInfo": t.optional(g("OpenInfoIn")),
            "profile": t.optional(g("ProfileIn")),
            "languageCode": t.string(),
            "storefrontAddress": t.optional(g("PostalAddressIn")),
            "serviceArea": t.optional(g("ServiceAreaBusinessIn")),
            "storeCode": t.optional(t.string()),
            "moreHours": t.optional(t.array(g("MoreHoursIn"))),
            "serviceItems": t.optional(t.array(g("ServiceItemIn"))),
            "title": t.string(),
            "specialHours": t.optional(g("SpecialHoursIn")),
            "categories": t.optional(g("CategoriesIn")),
            "relationshipData": t.optional(g("RelationshipDataIn")),
            "name": t.string(),
            "websiteUri": t.optional(t.string()),
            "phoneNumbers": t.optional(g("PhoneNumbersIn")),
            "regularHours": t.optional(g("BusinessHoursIn")),
            "labels": t.optional(t.array(t.string())),
            "latlng": t.optional(g("LatLngIn")),
        }
    ).named("LocationIn")
    location_out = t.struct(
        {
            "adWordsLocationExtensions": t.optional(g("AdWordsLocationExtensionsOut")),
            "openInfo": t.optional(g("OpenInfoOut")),
            "profile": t.optional(g("ProfileOut")),
            "metadata": g("MetadataOut"),
            "languageCode": t.string(),
            "storefrontAddress": t.optional(g("PostalAddressOut")),
            "serviceArea": t.optional(g("ServiceAreaBusinessOut")),
            "storeCode": t.optional(t.string()),
            "moreHours": t.optional(t.array(g("MoreHoursOut"))),
            "serviceItems": t.optional(t.array(g("ServiceItemOut"))),
            "title": t.string(),
            "specialHours": t.optional(g("SpecialHoursOut")),
            "categories": t.optional(g("CategoriesOut")),
            "relationshipData": t.optional(g("RelationshipDataOut")),
            "name": t.string(),
            "websiteUri": t.optional(t.string()),
            "phoneNumbers": t.optional(g("PhoneNumbersOut")),
            "regularHours": t.optional(g("BusinessHoursOut")),
            "labels": t.optional(t.array(t.string())),
            "latlng": t.optional(g("LatLngOut")),
        }
    ).named("LocationOut")
    search_google_locations_response_in = t.struct(
        {"googleLocations": t.array(g("GoogleLocationIn"))}
    ).named("SearchGoogleLocationsResponseIn")
    search_google_locations_response_out = t.struct(
        {"googleLocations": t.array(g("GoogleLocationOut"))}
    ).named("SearchGoogleLocationsResponseOut")
    categories_in = t.struct(
        {
            "additionalCategories": t.optional(t.array(g("CategoryIn"))),
            "primaryCategory": g("CategoryIn"),
        }
    ).named("CategoriesIn")
    categories_out = t.struct(
        {
            "additionalCategories": t.optional(t.array(g("CategoryOut"))),
            "primaryCategory": g("CategoryOut"),
        }
    ).named("CategoriesOut")
    service_item_in = t.struct(
        {
            "freeFormServiceItem": t.optional(g("FreeFormServiceItemIn")),
            "structuredServiceItem": t.optional(g("StructuredServiceItemIn")),
            "price": t.optional(g("MoneyIn")),
        }
    ).named("ServiceItemIn")
    service_item_out = t.struct(
        {
            "freeFormServiceItem": t.optional(g("FreeFormServiceItemOut")),
            "structuredServiceItem": t.optional(g("StructuredServiceItemOut")),
            "price": t.optional(g("MoneyOut")),
        }
    ).named("ServiceItemOut")
    ad_words_location_extensions_in = t.struct({"adPhone": t.string()}).named(
        "AdWordsLocationExtensionsIn"
    )
    ad_words_location_extensions_out = t.struct({"adPhone": t.string()}).named(
        "AdWordsLocationExtensionsOut"
    )
    label_in = t.struct(
        {
            "description": t.optional(t.string()),
            "languageCode": t.optional(t.string()),
            "displayName": t.string(),
        }
    ).named("LabelIn")
    label_out = t.struct(
        {
            "description": t.optional(t.string()),
            "languageCode": t.optional(t.string()),
            "displayName": t.string(),
        }
    ).named("LabelOut")
    list_categories_response_in = t.struct(
        {"categories": t.array(g("CategoryIn")), "nextPageToken": t.string()}
    ).named("ListCategoriesResponseIn")
    list_categories_response_out = t.struct(
        {"categories": t.array(g("CategoryOut")), "nextPageToken": t.string()}
    ).named("ListCategoriesResponseOut")
    chain_in = t.struct(
        {
            "name": t.string(),
            "chainNames": t.array(g("ChainNameIn")),
            "locationCount": t.integer(),
            "websites": t.array(g("ChainUriIn")),
        }
    ).named("ChainIn")
    chain_out = t.struct(
        {
            "name": t.string(),
            "chainNames": t.array(g("ChainNameOut")),
            "locationCount": t.integer(),
            "websites": t.array(g("ChainUriOut")),
        }
    ).named("ChainOut")
    service_type_in = t.struct({"_": t.optional(t.any())}).named("ServiceTypeIn")
    service_type_out = t.struct(
        {"displayName": t.string(), "serviceTypeId": t.string()}
    ).named("ServiceTypeOut")
    batch_get_categories_response_in = t.struct(
        {"categories": t.array(g("CategoryIn"))}
    ).named("BatchGetCategoriesResponseIn")
    batch_get_categories_response_out = t.struct(
        {"categories": t.array(g("CategoryOut"))}
    ).named("BatchGetCategoriesResponseOut")
    profile_in = t.struct({"description": t.string()}).named("ProfileIn")
    profile_out = t.struct({"description": t.string()}).named("ProfileOut")
    more_hours_type_in = t.struct({"_": t.optional(t.any())}).named("MoreHoursTypeIn")
    more_hours_type_out = t.struct(
        {
            "localizedDisplayName": t.string(),
            "hoursTypeId": t.string(),
            "displayName": t.string(),
        }
    ).named("MoreHoursTypeOut")
    clear_location_association_request_in = t.struct({"_": t.optional(t.any())}).named(
        "ClearLocationAssociationRequestIn"
    )
    clear_location_association_request_out = t.struct({"_": t.optional(t.any())}).named(
        "ClearLocationAssociationRequestOut"
    )
    attribute_in = t.struct(
        {
            "name": t.string(),
            "uriValues": t.array(g("UriAttributeValueIn")),
            "values": t.array(t.any()),
            "repeatedEnumValue": g("RepeatedEnumAttributeValueIn"),
        }
    ).named("AttributeIn")
    attribute_out = t.struct(
        {
            "name": t.string(),
            "valueType": t.string(),
            "uriValues": t.array(g("UriAttributeValueOut")),
            "values": t.array(t.any()),
            "repeatedEnumValue": g("RepeatedEnumAttributeValueOut"),
        }
    ).named("AttributeOut")
    g.expose(
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
                effect=Effect.none(),
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
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}",
                effect=Effect.none(),
            ),
        ).named("mybusinessbusinessinformation.chains.get"),
        googleLocationsSearch=t.func(
            t.struct({}),
            g("SearchGoogleLocationsResponseOut"),
            googleapis.RestMat(
                "POST",
                "https://mybusinessbusinessinformation.googleapis.com/v1/googleLocations:search",
                effect=Effect.create(),
            ),
        ).named("mybusinessbusinessinformation.googleLocations.search"),
        attributesList=t.func(
            t.struct(
                {
                    "categoryName": t.string(),
                    "regionCode": t.string(),
                    "parent": t.string(),
                    "showAll": t.boolean(),
                    "languageCode": t.string(),
                    "pageSize": t.integer(),
                    "pageToken": t.string(),
                }
            ),
            g("ListAttributeMetadataResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/attributes",
                effect=Effect.none(),
            ),
        ).named("mybusinessbusinessinformation.attributes.list"),
        accountsLocationsCreate=t.func(
            t.struct(
                {
                    "requestId": t.optional(t.string()),
                    "parent": t.string(),
                    "validateOnly": t.optional(t.boolean()),
                }
            ),
            g("LocationOut"),
            googleapis.RestMat(
                "POST",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+parent}/locations",
                effect=Effect.create(),
            ),
        ).named("mybusinessbusinessinformation.accounts.locations.create"),
        accountsLocationsList=t.func(
            t.struct(
                {
                    "orderBy": t.optional(t.string()),
                    "pageSize": t.optional(t.integer()),
                    "filter": t.optional(t.string()),
                    "pageToken": t.optional(t.string()),
                    "parent": t.string(),
                }
            ),
            g("ListLocationsResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+parent}/locations",
                effect=Effect.none(),
            ),
        ).named("mybusinessbusinessinformation.accounts.locations.list"),
        categoriesList=t.func(
            t.struct(
                {
                    "regionCode": t.string(),
                    "view": t.string(),
                    "pageToken": t.optional(t.string()),
                    "filter": t.optional(t.string()),
                    "pageSize": t.optional(t.integer()),
                    "languageCode": t.string(),
                }
            ),
            g("ListCategoriesResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/categories",
                effect=Effect.none(),
            ),
        ).named("mybusinessbusinessinformation.categories.list"),
        categoriesBatchGet=t.func(
            t.struct(
                {
                    "regionCode": t.optional(t.string()),
                    "names": t.string(),
                    "view": t.string(),
                    "languageCode": t.string(),
                }
            ),
            g("BatchGetCategoriesResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/categories:batchGet",
                effect=Effect.none(),
            ),
        ).named("mybusinessbusinessinformation.categories.batchGet"),
        locationsGet=t.func(
            t.struct(
                {
                    "name": t.string(),
                }
            ),
            g("LocationOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}",
                effect=Effect.none(),
            ),
        ).named("mybusinessbusinessinformation.locations.get"),
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
                effect=Effect.none(),
            ),
        ).named("mybusinessbusinessinformation.locations.getGoogleUpdated"),
        locationsUpdateAttributes=t.func(
            t.struct(
                {
                    "attributeMask": t.string(),
                    "name": t.string(),
                }
            ),
            g("AttributesOut"),
            googleapis.RestMat(
                "PATCH",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}",
                effect=Effect.update(),
            ),
        ).named("mybusinessbusinessinformation.locations.updateAttributes"),
        locationsGetAttributes=t.func(
            t.struct(
                {
                    "name": t.string(),
                }
            ),
            g("AttributesOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}",
                effect=Effect.none(),
            ),
        ).named("mybusinessbusinessinformation.locations.getAttributes"),
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
                effect=Effect.delete(),
            ),
        ).named("mybusinessbusinessinformation.locations.delete"),
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
                effect=Effect.create(),
            ),
        ).named("mybusinessbusinessinformation.locations.associate"),
        locationsPatch=t.func(
            t.struct(
                {
                    "name": t.string(),
                    "updateMask": t.string(),
                    "validateOnly": t.optional(t.boolean()),
                }
            ),
            g("LocationOut"),
            googleapis.RestMat(
                "PATCH",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}",
                effect=Effect.update(),
            ),
        ).named("mybusinessbusinessinformation.locations.patch"),
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
                effect=Effect.create(),
            ),
        ).named("mybusinessbusinessinformation.locations.clearLocationAssociation"),
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
                effect=Effect.none(),
            ),
        ).named("mybusinessbusinessinformation.locations.attributes.getGoogleUpdated"),
    )
