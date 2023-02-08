from typegraph import effects
from typegraph import t
from typegraph import TypeGraph
from typegraph.importers.google_discovery import import_googleapis
from typegraph.providers.google.runtimes import googleapis

discovery = (
    "https://mybusinessbusinessinformation.googleapis.com/$discovery/rest?version=v1"
)
import_googleapis(discovery, False)

with TypeGraph(name="mybusinessbusinessinformation") as g:
    google_location_in = t.struct(
        {
            "name": t.string(),
            "requestAdminRightsUri": t.string(),
            "location": g("LocationIn"),
        }
    ).named("GoogleLocationIn")
    google_location_out = t.struct(
        {
            "name": t.string(),
            "requestAdminRightsUri": t.string(),
            "location": g("LocationOut"),
        }
    ).named("GoogleLocationOut")
    category_in = t.struct({"name": t.string()}).named("CategoryIn")
    category_out = t.struct(
        {
            "displayName": t.string(),
            "serviceTypes": t.array(g("ServiceTypeOut")),
            "name": t.string(),
            "moreHoursTypes": t.array(g("MoreHoursTypeOut")),
        }
    ).named("CategoryOut")
    clear_location_association_request_in = t.struct({"_": t.optional(t.any())}).named(
        "ClearLocationAssociationRequestIn"
    )
    clear_location_association_request_out = t.struct({"_": t.optional(t.any())}).named(
        "ClearLocationAssociationRequestOut"
    )
    more_hours_in = t.struct(
        {"periods": t.array(g("TimePeriodIn")), "hoursTypeId": t.string()}
    ).named("MoreHoursIn")
    more_hours_out = t.struct(
        {"periods": t.array(g("TimePeriodOut")), "hoursTypeId": t.string()}
    ).named("MoreHoursOut")
    list_attribute_metadata_response_in = t.struct(
        {
            "attributeMetadata": t.array(g("AttributeMetadataIn")),
            "nextPageToken": t.string(),
        }
    ).named("ListAttributeMetadataResponseIn")
    list_attribute_metadata_response_out = t.struct(
        {
            "attributeMetadata": t.array(g("AttributeMetadataOut")),
            "nextPageToken": t.string(),
        }
    ).named("ListAttributeMetadataResponseOut")
    special_hours_in = t.struct(
        {"specialHourPeriods": t.array(g("SpecialHourPeriodIn"))}
    ).named("SpecialHoursIn")
    special_hours_out = t.struct(
        {"specialHourPeriods": t.array(g("SpecialHourPeriodOut"))}
    ).named("SpecialHoursOut")
    search_google_locations_request_in = t.struct(
        {"pageSize": t.integer(), "location": g("LocationIn"), "query": t.string()}
    ).named("SearchGoogleLocationsRequestIn")
    search_google_locations_request_out = t.struct(
        {"pageSize": t.integer(), "location": g("LocationOut"), "query": t.string()}
    ).named("SearchGoogleLocationsRequestOut")
    money_in = t.struct(
        {"units": t.string(), "currencyCode": t.string(), "nanos": t.integer()}
    ).named("MoneyIn")
    money_out = t.struct(
        {"units": t.string(), "currencyCode": t.string(), "nanos": t.integer()}
    ).named("MoneyOut")
    search_chains_response_in = t.struct({"chains": t.array(g("ChainIn"))}).named(
        "SearchChainsResponseIn"
    )
    search_chains_response_out = t.struct({"chains": t.array(g("ChainOut"))}).named(
        "SearchChainsResponseOut"
    )
    chain_uri_in = t.struct({"uri": t.string()}).named("ChainUriIn")
    chain_uri_out = t.struct({"uri": t.string()}).named("ChainUriOut")
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
    ad_words_location_extensions_in = t.struct({"adPhone": t.string()}).named(
        "AdWordsLocationExtensionsIn"
    )
    ad_words_location_extensions_out = t.struct({"adPhone": t.string()}).named(
        "AdWordsLocationExtensionsOut"
    )
    service_area_business_in = t.struct(
        {"regionCode": t.string(), "businessType": t.string(), "places": g("PlacesIn")}
    ).named("ServiceAreaBusinessIn")
    service_area_business_out = t.struct(
        {"regionCode": t.string(), "businessType": t.string(), "places": g("PlacesOut")}
    ).named("ServiceAreaBusinessOut")
    special_hour_period_in = t.struct(
        {
            "closed": t.optional(t.boolean()),
            "endDate": t.optional(g("DateIn")),
            "startDate": g("DateIn"),
            "openTime": t.optional(g("TimeOfDayIn")),
            "closeTime": t.optional(g("TimeOfDayIn")),
        }
    ).named("SpecialHourPeriodIn")
    special_hour_period_out = t.struct(
        {
            "closed": t.optional(t.boolean()),
            "endDate": t.optional(g("DateOut")),
            "startDate": g("DateOut"),
            "openTime": t.optional(g("TimeOfDayOut")),
            "closeTime": t.optional(g("TimeOfDayOut")),
        }
    ).named("SpecialHourPeriodOut")
    categories_in = t.struct(
        {
            "primaryCategory": g("CategoryIn"),
            "additionalCategories": t.optional(t.array(g("CategoryIn"))),
        }
    ).named("CategoriesIn")
    categories_out = t.struct(
        {
            "primaryCategory": g("CategoryOut"),
            "additionalCategories": t.optional(t.array(g("CategoryOut"))),
        }
    ).named("CategoriesOut")
    location_in = t.struct(
        {
            "title": t.string(),
            "labels": t.optional(t.array(t.string())),
            "languageCode": t.string(),
            "websiteUri": t.optional(t.string()),
            "latlng": t.optional(g("LatLngIn")),
            "categories": t.optional(g("CategoriesIn")),
            "serviceItems": t.optional(t.array(g("ServiceItemIn"))),
            "openInfo": t.optional(g("OpenInfoIn")),
            "profile": t.optional(g("ProfileIn")),
            "adWordsLocationExtensions": t.optional(g("AdWordsLocationExtensionsIn")),
            "storefrontAddress": t.optional(g("PostalAddressIn")),
            "moreHours": t.optional(t.array(g("MoreHoursIn"))),
            "storeCode": t.optional(t.string()),
            "serviceArea": t.optional(g("ServiceAreaBusinessIn")),
            "specialHours": t.optional(g("SpecialHoursIn")),
            "name": t.string(),
            "relationshipData": t.optional(g("RelationshipDataIn")),
            "phoneNumbers": t.optional(g("PhoneNumbersIn")),
            "regularHours": t.optional(g("BusinessHoursIn")),
        }
    ).named("LocationIn")
    location_out = t.struct(
        {
            "title": t.string(),
            "labels": t.optional(t.array(t.string())),
            "languageCode": t.string(),
            "websiteUri": t.optional(t.string()),
            "metadata": g("MetadataOut"),
            "latlng": t.optional(g("LatLngOut")),
            "categories": t.optional(g("CategoriesOut")),
            "serviceItems": t.optional(t.array(g("ServiceItemOut"))),
            "openInfo": t.optional(g("OpenInfoOut")),
            "profile": t.optional(g("ProfileOut")),
            "adWordsLocationExtensions": t.optional(g("AdWordsLocationExtensionsOut")),
            "storefrontAddress": t.optional(g("PostalAddressOut")),
            "moreHours": t.optional(t.array(g("MoreHoursOut"))),
            "storeCode": t.optional(t.string()),
            "serviceArea": t.optional(g("ServiceAreaBusinessOut")),
            "specialHours": t.optional(g("SpecialHoursOut")),
            "name": t.string(),
            "relationshipData": t.optional(g("RelationshipDataOut")),
            "phoneNumbers": t.optional(g("PhoneNumbersOut")),
            "regularHours": t.optional(g("BusinessHoursOut")),
        }
    ).named("LocationOut")
    place_info_in = t.struct({"placeName": t.string(), "placeId": t.string()}).named(
        "PlaceInfoIn"
    )
    place_info_out = t.struct({"placeName": t.string(), "placeId": t.string()}).named(
        "PlaceInfoOut"
    )
    empty_in = t.struct({"_": t.optional(t.any())}).named("EmptyIn")
    empty_out = t.struct({"_": t.optional(t.any())}).named("EmptyOut")
    time_period_in = t.struct(
        {
            "openTime": g("TimeOfDayIn"),
            "openDay": t.string(),
            "closeTime": g("TimeOfDayIn"),
            "closeDay": t.string(),
        }
    ).named("TimePeriodIn")
    time_period_out = t.struct(
        {
            "openTime": g("TimeOfDayOut"),
            "openDay": t.string(),
            "closeTime": g("TimeOfDayOut"),
            "closeDay": t.string(),
        }
    ).named("TimePeriodOut")
    time_of_day_in = t.struct(
        {
            "minutes": t.integer(),
            "nanos": t.integer(),
            "seconds": t.integer(),
            "hours": t.integer(),
        }
    ).named("TimeOfDayIn")
    time_of_day_out = t.struct(
        {
            "minutes": t.integer(),
            "nanos": t.integer(),
            "seconds": t.integer(),
            "hours": t.integer(),
        }
    ).named("TimeOfDayOut")
    attribute_value_metadata_in = t.struct(
        {"value": t.any(), "displayName": t.string()}
    ).named("AttributeValueMetadataIn")
    attribute_value_metadata_out = t.struct(
        {"value": t.any(), "displayName": t.string()}
    ).named("AttributeValueMetadataOut")
    uri_attribute_value_in = t.struct({"uri": t.string()}).named("UriAttributeValueIn")
    uri_attribute_value_out = t.struct({"uri": t.string()}).named(
        "UriAttributeValueOut"
    )
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
    free_form_service_item_in = t.struct(
        {"label": g("LabelIn"), "category": t.string()}
    ).named("FreeFormServiceItemIn")
    free_form_service_item_out = t.struct(
        {"label": g("LabelOut"), "category": t.string()}
    ).named("FreeFormServiceItemOut")
    phone_numbers_in = t.struct(
        {
            "additionalPhones": t.optional(t.array(t.string())),
            "primaryPhone": t.string(),
        }
    ).named("PhoneNumbersIn")
    phone_numbers_out = t.struct(
        {
            "additionalPhones": t.optional(t.array(t.string())),
            "primaryPhone": t.string(),
        }
    ).named("PhoneNumbersOut")
    attribute_in = t.struct(
        {
            "values": t.array(t.any()),
            "repeatedEnumValue": g("RepeatedEnumAttributeValueIn"),
            "uriValues": t.array(g("UriAttributeValueIn")),
            "name": t.string(),
        }
    ).named("AttributeIn")
    attribute_out = t.struct(
        {
            "values": t.array(t.any()),
            "repeatedEnumValue": g("RepeatedEnumAttributeValueOut"),
            "valueType": t.string(),
            "uriValues": t.array(g("UriAttributeValueOut")),
            "name": t.string(),
        }
    ).named("AttributeOut")
    places_in = t.struct({"placeInfos": t.array(g("PlaceInfoIn"))}).named("PlacesIn")
    places_out = t.struct({"placeInfos": t.array(g("PlaceInfoOut"))}).named("PlacesOut")
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
    list_categories_response_in = t.struct(
        {"categories": t.array(g("CategoryIn")), "nextPageToken": t.string()}
    ).named("ListCategoriesResponseIn")
    list_categories_response_out = t.struct(
        {"categories": t.array(g("CategoryOut")), "nextPageToken": t.string()}
    ).named("ListCategoriesResponseOut")
    attribute_metadata_in = t.struct(
        {
            "repeatable": t.boolean(),
            "displayName": t.string(),
            "valueType": t.string(),
            "deprecated": t.boolean(),
            "parent": t.string(),
            "valueMetadata": t.array(g("AttributeValueMetadataIn")),
            "groupDisplayName": t.string(),
        }
    ).named("AttributeMetadataIn")
    attribute_metadata_out = t.struct(
        {
            "repeatable": t.boolean(),
            "displayName": t.string(),
            "valueType": t.string(),
            "deprecated": t.boolean(),
            "parent": t.string(),
            "valueMetadata": t.array(g("AttributeValueMetadataOut")),
            "groupDisplayName": t.string(),
        }
    ).named("AttributeMetadataOut")
    google_updated_location_in = t.struct(
        {"diffMask": t.string(), "pendingMask": t.string(), "location": g("LocationIn")}
    ).named("GoogleUpdatedLocationIn")
    google_updated_location_out = t.struct(
        {
            "diffMask": t.string(),
            "pendingMask": t.string(),
            "location": g("LocationOut"),
        }
    ).named("GoogleUpdatedLocationOut")
    date_in = t.struct(
        {"month": t.integer(), "year": t.integer(), "day": t.integer()}
    ).named("DateIn")
    date_out = t.struct(
        {"month": t.integer(), "year": t.integer(), "day": t.integer()}
    ).named("DateOut")
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
    profile_in = t.struct({"description": t.string()}).named("ProfileIn")
    profile_out = t.struct({"description": t.string()}).named("ProfileOut")
    metadata_in = t.struct({"_": t.optional(t.any())}).named("MetadataIn")
    metadata_out = t.struct(
        {
            "canDelete": t.boolean(),
            "hasGoogleUpdated": t.boolean(),
            "canOperateLodgingData": t.boolean(),
            "placeId": t.string(),
            "canHaveBusinessCalls": t.boolean(),
            "canHaveFoodMenus": t.boolean(),
            "canOperateLocalPost": t.boolean(),
            "mapsUri": t.string(),
            "canModifyServiceList": t.boolean(),
            "hasVoiceOfMerchant": t.boolean(),
            "hasPendingEdits": t.boolean(),
            "newReviewUri": t.string(),
            "canOperateHealthData": t.boolean(),
            "duplicateLocation": t.string(),
        }
    ).named("MetadataOut")
    service_item_in = t.struct(
        {
            "price": t.optional(g("MoneyIn")),
            "structuredServiceItem": t.optional(g("StructuredServiceItemIn")),
            "freeFormServiceItem": t.optional(g("FreeFormServiceItemIn")),
        }
    ).named("ServiceItemIn")
    service_item_out = t.struct(
        {
            "price": t.optional(g("MoneyOut")),
            "structuredServiceItem": t.optional(g("StructuredServiceItemOut")),
            "freeFormServiceItem": t.optional(g("FreeFormServiceItemOut")),
        }
    ).named("ServiceItemOut")
    business_hours_in = t.struct({"periods": t.array(g("TimePeriodIn"))}).named(
        "BusinessHoursIn"
    )
    business_hours_out = t.struct({"periods": t.array(g("TimePeriodOut"))}).named(
        "BusinessHoursOut"
    )
    lat_lng_in = t.struct({"latitude": t.float(), "longitude": t.float()}).named(
        "LatLngIn"
    )
    lat_lng_out = t.struct({"latitude": t.float(), "longitude": t.float()}).named(
        "LatLngOut"
    )
    more_hours_type_in = t.struct({"_": t.optional(t.any())}).named("MoreHoursTypeIn")
    more_hours_type_out = t.struct(
        {
            "displayName": t.string(),
            "localizedDisplayName": t.string(),
            "hoursTypeId": t.string(),
        }
    ).named("MoreHoursTypeOut")
    chain_name_in = t.struct(
        {"displayName": t.string(), "languageCode": t.string()}
    ).named("ChainNameIn")
    chain_name_out = t.struct(
        {"displayName": t.string(), "languageCode": t.string()}
    ).named("ChainNameOut")
    postal_address_in = t.struct(
        {
            "sortingCode": t.optional(t.string()),
            "addressLines": t.array(t.string()),
            "administrativeArea": t.optional(t.string()),
            "languageCode": t.optional(t.string()),
            "organization": t.optional(t.string()),
            "recipients": t.optional(t.array(t.string())),
            "revision": t.integer(),
            "regionCode": t.string(),
            "sublocality": t.optional(t.string()),
            "locality": t.optional(t.string()),
            "postalCode": t.optional(t.string()),
        }
    ).named("PostalAddressIn")
    postal_address_out = t.struct(
        {
            "sortingCode": t.optional(t.string()),
            "addressLines": t.array(t.string()),
            "administrativeArea": t.optional(t.string()),
            "languageCode": t.optional(t.string()),
            "organization": t.optional(t.string()),
            "recipients": t.optional(t.array(t.string())),
            "revision": t.integer(),
            "regionCode": t.string(),
            "sublocality": t.optional(t.string()),
            "locality": t.optional(t.string()),
            "postalCode": t.optional(t.string()),
        }
    ).named("PostalAddressOut")
    service_type_in = t.struct({"_": t.optional(t.any())}).named("ServiceTypeIn")
    service_type_out = t.struct(
        {"displayName": t.string(), "serviceTypeId": t.string()}
    ).named("ServiceTypeOut")
    associate_location_request_in = t.struct({"placeId": t.string()}).named(
        "AssociateLocationRequestIn"
    )
    associate_location_request_out = t.struct({"placeId": t.string()}).named(
        "AssociateLocationRequestOut"
    )
    relevant_location_in = t.struct(
        {"placeId": t.string(), "relationType": t.string()}
    ).named("RelevantLocationIn")
    relevant_location_out = t.struct(
        {"placeId": t.string(), "relationType": t.string()}
    ).named("RelevantLocationOut")
    batch_get_categories_response_in = t.struct(
        {"categories": t.array(g("CategoryIn"))}
    ).named("BatchGetCategoriesResponseIn")
    batch_get_categories_response_out = t.struct(
        {"categories": t.array(g("CategoryOut"))}
    ).named("BatchGetCategoriesResponseOut")
    search_google_locations_response_in = t.struct(
        {"googleLocations": t.array(g("GoogleLocationIn"))}
    ).named("SearchGoogleLocationsResponseIn")
    search_google_locations_response_out = t.struct(
        {"googleLocations": t.array(g("GoogleLocationOut"))}
    ).named("SearchGoogleLocationsResponseOut")
    chain_in = t.struct(
        {
            "locationCount": t.integer(),
            "chainNames": t.array(g("ChainNameIn")),
            "websites": t.array(g("ChainUriIn")),
            "name": t.string(),
        }
    ).named("ChainIn")
    chain_out = t.struct(
        {
            "locationCount": t.integer(),
            "chainNames": t.array(g("ChainNameOut")),
            "websites": t.array(g("ChainUriOut")),
            "name": t.string(),
        }
    ).named("ChainOut")
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
    structured_service_item_in = t.struct(
        {"description": t.optional(t.string()), "serviceTypeId": t.string()}
    ).named("StructuredServiceItemIn")
    structured_service_item_out = t.struct(
        {"description": t.optional(t.string()), "serviceTypeId": t.string()}
    ).named("StructuredServiceItemOut")
    g.expose(
        categoriesList=t.func(
            t.struct(
                {
                    "pageSize": t.optional(t.integer()),
                    "filter": t.optional(t.string()),
                    "regionCode": t.string(),
                    "languageCode": t.string(),
                    "pageToken": t.optional(t.string()),
                    "view": t.string(),
                }
            ),
            g("ListCategoriesResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/categories",
                effect=effects.none(),
            ),
        ).named("mybusinessbusinessinformation.categories.list"),
        categoriesBatchGet=t.func(
            t.struct(
                {
                    "names": t.string(),
                    "languageCode": t.string(),
                    "regionCode": t.optional(t.string()),
                    "view": t.string(),
                }
            ),
            g("BatchGetCategoriesResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/categories:batchGet",
                effect=effects.none(),
            ),
        ).named("mybusinessbusinessinformation.categories.batchGet"),
        accountsLocationsCreate=t.func(
            t.struct(
                {
                    "parent": t.string(),
                    "requestId": t.optional(t.string()),
                    "validateOnly": t.optional(t.boolean()),
                }
            ),
            g("LocationOut"),
            googleapis.RestMat(
                "POST",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+parent}/locations",
                effect=effects.create(),
            ),
        ).named("mybusinessbusinessinformation.accounts.locations.create"),
        accountsLocationsList=t.func(
            t.struct(
                {
                    "parent": t.string(),
                    "pageToken": t.optional(t.string()),
                    "pageSize": t.optional(t.integer()),
                    "filter": t.optional(t.string()),
                    "orderBy": t.optional(t.string()),
                }
            ),
            g("ListLocationsResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+parent}/locations",
                effect=effects.none(),
            ),
        ).named("mybusinessbusinessinformation.accounts.locations.list"),
        googleLocationsSearch=t.func(
            t.struct({}),
            g("SearchGoogleLocationsResponseOut"),
            googleapis.RestMat(
                "POST",
                "https://mybusinessbusinessinformation.googleapis.com/v1/googleLocations:search",
                effect=effects.create(),
            ),
        ).named("mybusinessbusinessinformation.googleLocations.search"),
        attributesList=t.func(
            t.struct(
                {
                    "showAll": t.boolean(),
                    "languageCode": t.string(),
                    "categoryName": t.string(),
                    "parent": t.string(),
                    "regionCode": t.string(),
                    "pageSize": t.integer(),
                    "pageToken": t.string(),
                }
            ),
            g("ListAttributeMetadataResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/attributes",
                effect=effects.none(),
            ),
        ).named("mybusinessbusinessinformation.attributes.list"),
        chainsSearch=t.func(
            t.struct(
                {
                    "chainName": t.string(),
                    "pageSize": t.integer(),
                }
            ),
            g("SearchChainsResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/chains:search",
                effect=effects.none(),
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
                effect=effects.none(),
            ),
        ).named("mybusinessbusinessinformation.chains.get"),
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
                effect=effects.update(),
            ),
        ).named("mybusinessbusinessinformation.locations.updateAttributes"),
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
                effect=effects.none(),
            ),
        ).named("mybusinessbusinessinformation.locations.get"),
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
                effect=effects.create(),
            ),
        ).named("mybusinessbusinessinformation.locations.associate"),
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
                effect=effects.none(),
            ),
        ).named("mybusinessbusinessinformation.locations.getAttributes"),
        locationsPatch=t.func(
            t.struct(
                {
                    "updateMask": t.string(),
                    "validateOnly": t.optional(t.boolean()),
                    "name": t.string(),
                }
            ),
            g("LocationOut"),
            googleapis.RestMat(
                "PATCH",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}",
                effect=effects.update(),
            ),
        ).named("mybusinessbusinessinformation.locations.patch"),
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
                effect=effects.delete(),
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
                effect=effects.create(),
            ),
        ).named("mybusinessbusinessinformation.locations.clearLocationAssociation"),
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
                effect=effects.none(),
            ),
        ).named("mybusinessbusinessinformation.locations.getGoogleUpdated"),
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
                effect=effects.none(),
            ),
        ).named("mybusinessbusinessinformation.locations.attributes.getGoogleUpdated"),
    )
