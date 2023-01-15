from typegraph import t
from typegraph import TypeGraph
from typegraph.importers.google_discovery import import_googleapis
from typegraph.providers.google.runtimes import googleapis

discovery = (
    "https://mybusinessbusinessinformation.googleapis.com/$discovery/rest?version=v1"
)
import_googleapis(discovery, False)

with TypeGraph(name="mybusinessbusinessinformation") as g:
    location_in = t.struct(
        {
            "moreHours": t.optional(t.array(g("MoreHoursIn"))),
            "title": t.string(),
            "specialHours": t.optional(g("SpecialHoursIn")),
            "phoneNumbers": t.optional(g("PhoneNumbersIn")),
            "languageCode": t.string(),
            "relationshipData": t.optional(g("RelationshipDataIn")),
            "serviceItems": t.optional(t.array(g("ServiceItemIn"))),
            "adWordsLocationExtensions": t.optional(g("AdWordsLocationExtensionsIn")),
            "openInfo": t.optional(g("OpenInfoIn")),
            "labels": t.optional(t.array(t.string())),
            "websiteUri": t.optional(t.string()),
            "name": t.string(),
            "profile": t.optional(g("ProfileIn")),
            "storeCode": t.optional(t.string()),
            "storefrontAddress": t.optional(g("PostalAddressIn")),
            "regularHours": t.optional(g("BusinessHoursIn")),
            "serviceArea": t.optional(g("ServiceAreaBusinessIn")),
            "latlng": t.optional(g("LatLngIn")),
            "categories": t.optional(g("CategoriesIn")),
        }
    ).named("LocationIn")
    location_out = t.struct(
        {
            "moreHours": t.optional(t.array(g("MoreHoursOut"))),
            "title": t.string(),
            "specialHours": t.optional(g("SpecialHoursOut")),
            "phoneNumbers": t.optional(g("PhoneNumbersOut")),
            "languageCode": t.string(),
            "relationshipData": t.optional(g("RelationshipDataOut")),
            "serviceItems": t.optional(t.array(g("ServiceItemOut"))),
            "adWordsLocationExtensions": t.optional(g("AdWordsLocationExtensionsOut")),
            "openInfo": t.optional(g("OpenInfoOut")),
            "labels": t.optional(t.array(t.string())),
            "websiteUri": t.optional(t.string()),
            "name": t.string(),
            "profile": t.optional(g("ProfileOut")),
            "storeCode": t.optional(t.string()),
            "storefrontAddress": t.optional(g("PostalAddressOut")),
            "metadata": g("MetadataOut"),
            "regularHours": t.optional(g("BusinessHoursOut")),
            "serviceArea": t.optional(g("ServiceAreaBusinessOut")),
            "latlng": t.optional(g("LatLngOut")),
            "categories": t.optional(g("CategoriesOut")),
        }
    ).named("LocationOut")
    special_hour_period_in = t.struct(
        {
            "closeTime": t.optional(g("TimeOfDayIn")),
            "endDate": t.optional(g("DateIn")),
            "closed": t.optional(t.boolean()),
            "startDate": g("DateIn"),
            "openTime": t.optional(g("TimeOfDayIn")),
        }
    ).named("SpecialHourPeriodIn")
    special_hour_period_out = t.struct(
        {
            "closeTime": t.optional(g("TimeOfDayOut")),
            "endDate": t.optional(g("DateOut")),
            "closed": t.optional(t.boolean()),
            "startDate": g("DateOut"),
            "openTime": t.optional(g("TimeOfDayOut")),
        }
    ).named("SpecialHourPeriodOut")
    time_period_in = t.struct(
        {
            "closeTime": g("TimeOfDayIn"),
            "closeDay": t.string(),
            "openDay": t.string(),
            "openTime": g("TimeOfDayIn"),
        }
    ).named("TimePeriodIn")
    time_period_out = t.struct(
        {
            "closeTime": g("TimeOfDayOut"),
            "closeDay": t.string(),
            "openDay": t.string(),
            "openTime": g("TimeOfDayOut"),
        }
    ).named("TimePeriodOut")
    more_hours_in = t.struct(
        {"periods": t.array(g("TimePeriodIn")), "hoursTypeId": t.string()}
    ).named("MoreHoursIn")
    more_hours_out = t.struct(
        {"periods": t.array(g("TimePeriodOut")), "hoursTypeId": t.string()}
    ).named("MoreHoursOut")
    chain_uri_in = t.struct({"uri": t.string()}).named("ChainUriIn")
    chain_uri_out = t.struct({"uri": t.string()}).named("ChainUriOut")
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
    list_categories_response_in = t.struct(
        {"nextPageToken": t.string(), "categories": t.array(g("CategoryIn"))}
    ).named("ListCategoriesResponseIn")
    list_categories_response_out = t.struct(
        {"nextPageToken": t.string(), "categories": t.array(g("CategoryOut"))}
    ).named("ListCategoriesResponseOut")
    more_hours_type_in = t.struct({"_": t.optional(t.any())}).named("MoreHoursTypeIn")
    more_hours_type_out = t.struct(
        {
            "hoursTypeId": t.string(),
            "localizedDisplayName": t.string(),
            "displayName": t.string(),
        }
    ).named("MoreHoursTypeOut")
    place_info_in = t.struct({"placeName": t.string(), "placeId": t.string()}).named(
        "PlaceInfoIn"
    )
    place_info_out = t.struct({"placeName": t.string(), "placeId": t.string()}).named(
        "PlaceInfoOut"
    )
    repeated_enum_attribute_value_in = t.struct(
        {"unsetValues": t.array(t.string()), "setValues": t.array(t.string())}
    ).named("RepeatedEnumAttributeValueIn")
    repeated_enum_attribute_value_out = t.struct(
        {"unsetValues": t.array(t.string()), "setValues": t.array(t.string())}
    ).named("RepeatedEnumAttributeValueOut")
    attribute_in = t.struct(
        {
            "repeatedEnumValue": g("RepeatedEnumAttributeValueIn"),
            "uriValues": t.array(g("UriAttributeValueIn")),
            "values": t.array(t.any()),
            "name": t.string(),
        }
    ).named("AttributeIn")
    attribute_out = t.struct(
        {
            "repeatedEnumValue": g("RepeatedEnumAttributeValueOut"),
            "valueType": t.string(),
            "uriValues": t.array(g("UriAttributeValueOut")),
            "values": t.array(t.any()),
            "name": t.string(),
        }
    ).named("AttributeOut")
    search_google_locations_response_in = t.struct(
        {"googleLocations": t.array(g("GoogleLocationIn"))}
    ).named("SearchGoogleLocationsResponseIn")
    search_google_locations_response_out = t.struct(
        {"googleLocations": t.array(g("GoogleLocationOut"))}
    ).named("SearchGoogleLocationsResponseOut")
    date_in = t.struct(
        {"year": t.integer(), "day": t.integer(), "month": t.integer()}
    ).named("DateIn")
    date_out = t.struct(
        {"year": t.integer(), "day": t.integer(), "month": t.integer()}
    ).named("DateOut")
    free_form_service_item_in = t.struct(
        {"category": t.string(), "label": g("LabelIn")}
    ).named("FreeFormServiceItemIn")
    free_form_service_item_out = t.struct(
        {"category": t.string(), "label": g("LabelOut")}
    ).named("FreeFormServiceItemOut")
    google_location_in = t.struct(
        {
            "requestAdminRightsUri": t.string(),
            "name": t.string(),
            "location": g("LocationIn"),
        }
    ).named("GoogleLocationIn")
    google_location_out = t.struct(
        {
            "requestAdminRightsUri": t.string(),
            "name": t.string(),
            "location": g("LocationOut"),
        }
    ).named("GoogleLocationOut")
    ad_words_location_extensions_in = t.struct({"adPhone": t.string()}).named(
        "AdWordsLocationExtensionsIn"
    )
    ad_words_location_extensions_out = t.struct({"adPhone": t.string()}).named(
        "AdWordsLocationExtensionsOut"
    )
    special_hours_in = t.struct(
        {"specialHourPeriods": t.array(g("SpecialHourPeriodIn"))}
    ).named("SpecialHoursIn")
    special_hours_out = t.struct(
        {"specialHourPeriods": t.array(g("SpecialHourPeriodOut"))}
    ).named("SpecialHoursOut")
    clear_location_association_request_in = t.struct({"_": t.optional(t.any())}).named(
        "ClearLocationAssociationRequestIn"
    )
    clear_location_association_request_out = t.struct({"_": t.optional(t.any())}).named(
        "ClearLocationAssociationRequestOut"
    )
    attribute_value_metadata_in = t.struct(
        {"value": t.any(), "displayName": t.string()}
    ).named("AttributeValueMetadataIn")
    attribute_value_metadata_out = t.struct(
        {"value": t.any(), "displayName": t.string()}
    ).named("AttributeValueMetadataOut")
    chain_in = t.struct(
        {
            "name": t.string(),
            "websites": t.array(g("ChainUriIn")),
            "chainNames": t.array(g("ChainNameIn")),
            "locationCount": t.integer(),
        }
    ).named("ChainIn")
    chain_out = t.struct(
        {
            "name": t.string(),
            "websites": t.array(g("ChainUriOut")),
            "chainNames": t.array(g("ChainNameOut")),
            "locationCount": t.integer(),
        }
    ).named("ChainOut")
    associate_location_request_in = t.struct({"placeId": t.string()}).named(
        "AssociateLocationRequestIn"
    )
    associate_location_request_out = t.struct({"placeId": t.string()}).named(
        "AssociateLocationRequestOut"
    )
    money_in = t.struct(
        {"nanos": t.integer(), "units": t.string(), "currencyCode": t.string()}
    ).named("MoneyIn")
    money_out = t.struct(
        {"nanos": t.integer(), "units": t.string(), "currencyCode": t.string()}
    ).named("MoneyOut")
    time_of_day_in = t.struct(
        {
            "nanos": t.integer(),
            "seconds": t.integer(),
            "hours": t.integer(),
            "minutes": t.integer(),
        }
    ).named("TimeOfDayIn")
    time_of_day_out = t.struct(
        {
            "nanos": t.integer(),
            "seconds": t.integer(),
            "hours": t.integer(),
            "minutes": t.integer(),
        }
    ).named("TimeOfDayOut")
    metadata_in = t.struct({"_": t.optional(t.any())}).named("MetadataIn")
    metadata_out = t.struct(
        {
            "hasGoogleUpdated": t.boolean(),
            "hasPendingEdits": t.boolean(),
            "newReviewUri": t.string(),
            "canModifyServiceList": t.boolean(),
            "canOperateLodgingData": t.boolean(),
            "placeId": t.string(),
            "canOperateHealthData": t.boolean(),
            "canHaveFoodMenus": t.boolean(),
            "duplicateLocation": t.string(),
            "canOperateLocalPost": t.boolean(),
            "mapsUri": t.string(),
            "canHaveBusinessCalls": t.boolean(),
            "canDelete": t.boolean(),
            "hasVoiceOfMerchant": t.boolean(),
        }
    ).named("MetadataOut")
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
    lat_lng_in = t.struct({"latitude": t.float(), "longitude": t.float()}).named(
        "LatLngIn"
    )
    lat_lng_out = t.struct({"latitude": t.float(), "longitude": t.float()}).named(
        "LatLngOut"
    )
    structured_service_item_in = t.struct(
        {"serviceTypeId": t.string(), "description": t.optional(t.string())}
    ).named("StructuredServiceItemIn")
    structured_service_item_out = t.struct(
        {"serviceTypeId": t.string(), "description": t.optional(t.string())}
    ).named("StructuredServiceItemOut")
    list_locations_response_in = t.struct(
        {
            "nextPageToken": t.string(),
            "locations": t.array(g("LocationIn")),
            "totalSize": t.integer(),
        }
    ).named("ListLocationsResponseIn")
    list_locations_response_out = t.struct(
        {
            "nextPageToken": t.string(),
            "locations": t.array(g("LocationOut")),
            "totalSize": t.integer(),
        }
    ).named("ListLocationsResponseOut")
    relevant_location_in = t.struct(
        {"relationType": t.string(), "placeId": t.string()}
    ).named("RelevantLocationIn")
    relevant_location_out = t.struct(
        {"relationType": t.string(), "placeId": t.string()}
    ).named("RelevantLocationOut")
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
    category_in = t.struct({"name": t.string()}).named("CategoryIn")
    category_out = t.struct(
        {
            "name": t.string(),
            "moreHoursTypes": t.array(g("MoreHoursTypeOut")),
            "displayName": t.string(),
            "serviceTypes": t.array(g("ServiceTypeOut")),
        }
    ).named("CategoryOut")
    relationship_data_in = t.struct(
        {
            "parentChain": t.string(),
            "parentLocation": g("RelevantLocationIn"),
            "childrenLocations": t.array(g("RelevantLocationIn")),
        }
    ).named("RelationshipDataIn")
    relationship_data_out = t.struct(
        {
            "parentChain": t.string(),
            "parentLocation": g("RelevantLocationOut"),
            "childrenLocations": t.array(g("RelevantLocationOut")),
        }
    ).named("RelationshipDataOut")
    attribute_metadata_in = t.struct(
        {
            "repeatable": t.boolean(),
            "displayName": t.string(),
            "valueMetadata": t.array(g("AttributeValueMetadataIn")),
            "deprecated": t.boolean(),
            "valueType": t.string(),
            "groupDisplayName": t.string(),
            "parent": t.string(),
        }
    ).named("AttributeMetadataIn")
    attribute_metadata_out = t.struct(
        {
            "repeatable": t.boolean(),
            "displayName": t.string(),
            "valueMetadata": t.array(g("AttributeValueMetadataOut")),
            "deprecated": t.boolean(),
            "valueType": t.string(),
            "groupDisplayName": t.string(),
            "parent": t.string(),
        }
    ).named("AttributeMetadataOut")
    profile_in = t.struct({"description": t.string()}).named("ProfileIn")
    profile_out = t.struct({"description": t.string()}).named("ProfileOut")
    places_in = t.struct({"placeInfos": t.array(g("PlaceInfoIn"))}).named("PlacesIn")
    places_out = t.struct({"placeInfos": t.array(g("PlaceInfoOut"))}).named("PlacesOut")
    business_hours_in = t.struct({"periods": t.array(g("TimePeriodIn"))}).named(
        "BusinessHoursIn"
    )
    business_hours_out = t.struct({"periods": t.array(g("TimePeriodOut"))}).named(
        "BusinessHoursOut"
    )
    uri_attribute_value_in = t.struct({"uri": t.string()}).named("UriAttributeValueIn")
    uri_attribute_value_out = t.struct({"uri": t.string()}).named(
        "UriAttributeValueOut"
    )
    attributes_in = t.struct(
        {"name": t.string(), "attributes": t.array(g("AttributeIn"))}
    ).named("AttributesIn")
    attributes_out = t.struct(
        {"name": t.string(), "attributes": t.array(g("AttributeOut"))}
    ).named("AttributesOut")
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
    service_type_in = t.struct({"_": t.optional(t.any())}).named("ServiceTypeIn")
    service_type_out = t.struct(
        {"serviceTypeId": t.string(), "displayName": t.string()}
    ).named("ServiceTypeOut")
    service_item_in = t.struct(
        {
            "price": t.optional(g("MoneyIn")),
            "freeFormServiceItem": t.optional(g("FreeFormServiceItemIn")),
            "structuredServiceItem": t.optional(g("StructuredServiceItemIn")),
        }
    ).named("ServiceItemIn")
    service_item_out = t.struct(
        {
            "price": t.optional(g("MoneyOut")),
            "freeFormServiceItem": t.optional(g("FreeFormServiceItemOut")),
            "structuredServiceItem": t.optional(g("StructuredServiceItemOut")),
        }
    ).named("ServiceItemOut")
    search_chains_response_in = t.struct({"chains": t.array(g("ChainIn"))}).named(
        "SearchChainsResponseIn"
    )
    search_chains_response_out = t.struct({"chains": t.array(g("ChainOut"))}).named(
        "SearchChainsResponseOut"
    )
    chain_name_in = t.struct(
        {"displayName": t.string(), "languageCode": t.string()}
    ).named("ChainNameIn")
    chain_name_out = t.struct(
        {"displayName": t.string(), "languageCode": t.string()}
    ).named("ChainNameOut")
    postal_address_in = t.struct(
        {
            "locality": t.optional(t.string()),
            "recipients": t.optional(t.array(t.string())),
            "postalCode": t.optional(t.string()),
            "regionCode": t.string(),
            "languageCode": t.optional(t.string()),
            "sortingCode": t.optional(t.string()),
            "sublocality": t.optional(t.string()),
            "organization": t.optional(t.string()),
            "revision": t.integer(),
            "administrativeArea": t.optional(t.string()),
            "addressLines": t.array(t.string()),
        }
    ).named("PostalAddressIn")
    postal_address_out = t.struct(
        {
            "locality": t.optional(t.string()),
            "recipients": t.optional(t.array(t.string())),
            "postalCode": t.optional(t.string()),
            "regionCode": t.string(),
            "languageCode": t.optional(t.string()),
            "sortingCode": t.optional(t.string()),
            "sublocality": t.optional(t.string()),
            "organization": t.optional(t.string()),
            "revision": t.integer(),
            "administrativeArea": t.optional(t.string()),
            "addressLines": t.array(t.string()),
        }
    ).named("PostalAddressOut")
    empty_in = t.struct({"_": t.optional(t.any())}).named("EmptyIn")
    empty_out = t.struct({"_": t.optional(t.any())}).named("EmptyOut")
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
    label_in = t.struct(
        {
            "displayName": t.string(),
            "description": t.optional(t.string()),
            "languageCode": t.optional(t.string()),
        }
    ).named("LabelIn")
    label_out = t.struct(
        {
            "displayName": t.string(),
            "description": t.optional(t.string()),
            "languageCode": t.optional(t.string()),
        }
    ).named("LabelOut")
    batch_get_categories_response_in = t.struct(
        {"categories": t.array(g("CategoryIn"))}
    ).named("BatchGetCategoriesResponseIn")
    batch_get_categories_response_out = t.struct(
        {"categories": t.array(g("CategoryOut"))}
    ).named("BatchGetCategoriesResponseOut")
    search_google_locations_request_in = t.struct(
        {"location": g("LocationIn"), "pageSize": t.integer(), "query": t.string()}
    ).named("SearchGoogleLocationsRequestIn")
    search_google_locations_request_out = t.struct(
        {"location": g("LocationOut"), "pageSize": t.integer(), "query": t.string()}
    ).named("SearchGoogleLocationsRequestOut")
    service_area_business_in = t.struct(
        {"regionCode": t.string(), "businessType": t.string(), "places": g("PlacesIn")}
    ).named("ServiceAreaBusinessIn")
    service_area_business_out = t.struct(
        {"regionCode": t.string(), "businessType": t.string(), "places": g("PlacesOut")}
    ).named("ServiceAreaBusinessOut")
    g.expose(
        accountsLocationsCreate=t.func(
            t.struct(
                {
                    "validateOnly": t.optional(t.boolean()),
                    "requestId": t.optional(t.string()),
                    "parent": t.string(),
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
                    "parent": t.string(),
                    "orderBy": t.optional(t.string()),
                    "filter": t.optional(t.string()),
                    "pageToken": t.optional(t.string()),
                    "pageSize": t.optional(t.integer()),
                }
            ),
            g("ListLocationsResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+parent}/locations",
            ),
        ).named("mybusinessbusinessinformation.accounts.locations.list"),
        attributesList=t.func(
            t.struct(
                {
                    "categoryName": t.string(),
                    "pageSize": t.integer(),
                    "regionCode": t.string(),
                    "languageCode": t.string(),
                    "parent": t.string(),
                    "showAll": t.boolean(),
                    "pageToken": t.string(),
                }
            ),
            g("ListAttributeMetadataResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/attributes",
            ),
        ).named("mybusinessbusinessinformation.attributes.list"),
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
        categoriesList=t.func(
            t.struct(
                {
                    "languageCode": t.string(),
                    "filter": t.optional(t.string()),
                    "pageSize": t.optional(t.integer()),
                    "regionCode": t.string(),
                    "pageToken": t.optional(t.string()),
                    "view": t.string(),
                }
            ),
            g("ListCategoriesResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/categories",
            ),
        ).named("mybusinessbusinessinformation.categories.list"),
        categoriesBatchGet=t.func(
            t.struct(
                {
                    "view": t.string(),
                    "regionCode": t.optional(t.string()),
                    "languageCode": t.string(),
                    "names": t.string(),
                }
            ),
            g("BatchGetCategoriesResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/categories:batchGet",
            ),
        ).named("mybusinessbusinessinformation.categories.batchGet"),
        googleLocationsSearch=t.func(
            t.struct({}),
            g("SearchGoogleLocationsResponseOut"),
            googleapis.RestMat(
                "POST",
                "https://mybusinessbusinessinformation.googleapis.com/v1/googleLocations:search",
            ),
        ).named("mybusinessbusinessinformation.googleLocations.search"),
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
            ),
        ).named("mybusinessbusinessinformation.locations.updateAttributes"),
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
    )
