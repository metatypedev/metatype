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
    chain_uri_in = t.struct({"uri": t.string()}).named("ChainUriIn")
    chain_uri_out = t.struct({"uri": t.string()}).named("ChainUriOut")
    service_item_in = t.struct(
        {
            "structuredServiceItem": t.optional(g("StructuredServiceItemIn")),
            "price": t.optional(g("MoneyIn")),
            "freeFormServiceItem": t.optional(g("FreeFormServiceItemIn")),
        }
    ).named("ServiceItemIn")
    service_item_out = t.struct(
        {
            "structuredServiceItem": t.optional(g("StructuredServiceItemOut")),
            "price": t.optional(g("MoneyOut")),
            "freeFormServiceItem": t.optional(g("FreeFormServiceItemOut")),
        }
    ).named("ServiceItemOut")
    postal_address_in = t.struct(
        {
            "organization": t.optional(t.string()),
            "administrativeArea": t.optional(t.string()),
            "addressLines": t.array(t.string()),
            "recipients": t.optional(t.array(t.string())),
            "sortingCode": t.optional(t.string()),
            "regionCode": t.string(),
            "sublocality": t.optional(t.string()),
            "postalCode": t.optional(t.string()),
            "revision": t.integer(),
            "locality": t.optional(t.string()),
            "languageCode": t.optional(t.string()),
        }
    ).named("PostalAddressIn")
    postal_address_out = t.struct(
        {
            "organization": t.optional(t.string()),
            "administrativeArea": t.optional(t.string()),
            "addressLines": t.array(t.string()),
            "recipients": t.optional(t.array(t.string())),
            "sortingCode": t.optional(t.string()),
            "regionCode": t.string(),
            "sublocality": t.optional(t.string()),
            "postalCode": t.optional(t.string()),
            "revision": t.integer(),
            "locality": t.optional(t.string()),
            "languageCode": t.optional(t.string()),
        }
    ).named("PostalAddressOut")
    location_in = t.struct(
        {
            "regularHours": t.optional(g("BusinessHoursIn")),
            "specialHours": t.optional(g("SpecialHoursIn")),
            "relationshipData": t.optional(g("RelationshipDataIn")),
            "storefrontAddress": t.optional(g("PostalAddressIn")),
            "profile": t.optional(g("ProfileIn")),
            "storeCode": t.optional(t.string()),
            "openInfo": t.optional(g("OpenInfoIn")),
            "languageCode": t.string(),
            "adWordsLocationExtensions": t.optional(g("AdWordsLocationExtensionsIn")),
            "categories": t.optional(g("CategoriesIn")),
            "latlng": t.optional(g("LatLngIn")),
            "labels": t.optional(t.array(t.string())),
            "phoneNumbers": t.optional(g("PhoneNumbersIn")),
            "websiteUri": t.optional(t.string()),
            "serviceItems": t.optional(t.array(g("ServiceItemIn"))),
            "serviceArea": t.optional(g("ServiceAreaBusinessIn")),
            "moreHours": t.optional(t.array(g("MoreHoursIn"))),
            "name": t.string(),
            "title": t.string(),
        }
    ).named("CategoryOut")
    postal_address_in = t.struct(
        {
            "regularHours": t.optional(g("BusinessHoursOut")),
            "specialHours": t.optional(g("SpecialHoursOut")),
            "relationshipData": t.optional(g("RelationshipDataOut")),
            "storefrontAddress": t.optional(g("PostalAddressOut")),
            "profile": t.optional(g("ProfileOut")),
            "storeCode": t.optional(t.string()),
            "openInfo": t.optional(g("OpenInfoOut")),
            "languageCode": t.string(),
            "adWordsLocationExtensions": t.optional(g("AdWordsLocationExtensionsOut")),
            "categories": t.optional(g("CategoriesOut")),
            "latlng": t.optional(g("LatLngOut")),
            "labels": t.optional(t.array(t.string())),
            "phoneNumbers": t.optional(g("PhoneNumbersOut")),
            "websiteUri": t.optional(t.string()),
            "serviceItems": t.optional(t.array(g("ServiceItemOut"))),
            "serviceArea": t.optional(g("ServiceAreaBusinessOut")),
            "moreHours": t.optional(t.array(g("MoreHoursOut"))),
            "name": t.string(),
            "title": t.string(),
            "metadata": g("MetadataOut"),
        }
    ).named("LocationOut")
    search_google_locations_request_in = t.struct(
        {"location": g("LocationIn"), "pageSize": t.integer(), "query": t.string()}
    ).named("SearchGoogleLocationsRequestIn")
    search_google_locations_request_out = t.struct(
        {"location": g("LocationOut"), "pageSize": t.integer(), "query": t.string()}
    ).named("SearchGoogleLocationsRequestOut")
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
    metadata_in = t.struct({"_": t.optional(t.any())}).named("MetadataIn")
    metadata_out = t.struct(
        {
            "canHaveFoodMenus": t.boolean(),
            "canModifyServiceList": t.boolean(),
            "placeId": t.string(),
            "canOperateHealthData": t.boolean(),
            "canOperateLodgingData": t.boolean(),
            "hasVoiceOfMerchant": t.boolean(),
            "newReviewUri": t.string(),
            "canHaveBusinessCalls": t.boolean(),
            "canDelete": t.boolean(),
            "mapsUri": t.string(),
            "hasPendingEdits": t.boolean(),
            "canOperateLocalPost": t.boolean(),
            "hasGoogleUpdated": t.boolean(),
            "duplicateLocation": t.string(),
        }
    ).named("MetadataOut")
    list_categories_response_in = t.struct(
        {"nextPageToken": t.string(), "categories": t.array(g("CategoryIn"))}
    ).named("ListCategoriesResponseIn")
    list_categories_response_out = t.struct(
        {"nextPageToken": t.string(), "categories": t.array(g("CategoryOut"))}
    ).named("ListCategoriesResponseOut")
    relevant_location_in = t.struct(
        {"relationType": t.string(), "placeId": t.string()}
    ).named("RelevantLocationIn")
    relevant_location_out = t.struct(
        {"relationType": t.string(), "placeId": t.string()}
    ).named("RelevantLocationOut")
    time_of_day_in = t.struct(
        {
            "minutes": t.integer(),
            "hours": t.integer(),
            "seconds": t.integer(),
            "nanos": t.integer(),
        }
    ).named("TimeOfDayIn")
    time_of_day_out = t.struct(
        {
            "minutes": t.integer(),
            "hours": t.integer(),
            "seconds": t.integer(),
            "nanos": t.integer(),
        }
    ).named("TimeOfDayOut")
    repeated_enum_attribute_value_in = t.struct(
        {"setValues": t.array(t.string()), "unsetValues": t.array(t.string())}
    ).named("RepeatedEnumAttributeValueIn")
    repeated_enum_attribute_value_out = t.struct(
        {"setValues": t.array(t.string()), "unsetValues": t.array(t.string())}
    ).named("RepeatedEnumAttributeValueOut")
    attribute_metadata_in = t.struct(
        {
            "valueMetadata": t.array(g("AttributeValueMetadataIn")),
            "deprecated": t.boolean(),
            "groupDisplayName": t.string(),
            "displayName": t.string(),
            "valueType": t.string(),
            "repeatable": t.boolean(),
            "parent": t.string(),
        }
    ).named("AttributeMetadataIn")
    attribute_metadata_out = t.struct(
        {
            "valueMetadata": t.array(g("AttributeValueMetadataOut")),
            "deprecated": t.boolean(),
            "groupDisplayName": t.string(),
            "displayName": t.string(),
            "valueType": t.string(),
            "repeatable": t.boolean(),
            "parent": t.string(),
        }
    ).named("AttributeMetadataOut")
    more_hours_type_in = t.struct({"_": t.optional(t.any())}).named("MoreHoursTypeIn")
    more_hours_type_out = t.struct(
        {
            "localizedDisplayName": t.string(),
            "displayName": t.string(),
            "hoursTypeId": t.string(),
        }
    ).named("MoreHoursTypeOut")
    attributes_in = t.struct(
        {"attributes": t.array(g("AttributeIn")), "name": t.string()}
    ).named("AttributesIn")
    attributes_out = t.struct(
        {"attributes": t.array(g("AttributeOut")), "name": t.string()}
    ).named("AttributesOut")
    lat_lng_in = t.struct({"latitude": t.float(), "longitude": t.float()}).named(
        "LatLngIn"
    )
    lat_lng_out = t.struct({"latitude": t.float(), "longitude": t.float()}).named(
        "LatLngOut"
    )
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
    place_info_in = t.struct({"placeName": t.string(), "placeId": t.string()}).named(
        "PlaceInfoIn"
    )
    place_info_out = t.struct({"placeName": t.string(), "placeId": t.string()}).named(
        "PlaceInfoOut"
    )
    chain_in = t.struct(
        {
            "chainNames": t.array(g("ChainNameIn")),
            "locationCount": t.integer(),
            "websites": t.array(g("ChainUriIn")),
            "name": t.string(),
        }
    ).named("ChainIn")
    chain_out = t.struct(
        {
            "chainNames": t.array(g("ChainNameOut")),
            "locationCount": t.integer(),
            "websites": t.array(g("ChainUriOut")),
            "name": t.string(),
        }
    ).named("ChainOut")
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
    places_in = t.struct({"placeInfos": t.array(g("PlaceInfoIn"))}).named("PlacesIn")
    places_out = t.struct({"placeInfos": t.array(g("PlaceInfoOut"))}).named("PlacesOut")
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
    search_google_locations_response_in = t.struct(
        {"googleLocations": t.array(g("GoogleLocationIn"))}
    ).named("SearchGoogleLocationsResponseIn")
    search_google_locations_response_out = t.struct(
        {"googleLocations": t.array(g("GoogleLocationOut"))}
    ).named("SearchGoogleLocationsResponseOut")
    chain_name_in = t.struct(
        {"displayName": t.string(), "languageCode": t.string()}
    ).named("ChainNameIn")
    chain_name_out = t.struct(
        {"displayName": t.string(), "languageCode": t.string()}
    ).named("ChainNameOut")
    category_in = t.struct({"name": t.string()}).named("CategoryIn")
    category_out = t.struct(
        {
            "displayName": t.string(),
            "serviceTypes": t.array(g("ServiceTypeOut")),
            "name": t.string(),
            "moreHoursTypes": t.array(g("MoreHoursTypeOut")),
        }
    ).named("CategoryOut")
    profile_in = t.struct({"description": t.string()}).named("ProfileIn")
    profile_out = t.struct({"description": t.string()}).named("ProfileOut")
    empty_in = t.struct({"_": t.optional(t.any())}).named("EmptyIn")
    empty_out = t.struct({"_": t.optional(t.any())}).named("EmptyOut")
    date_in = t.struct(
        {"day": t.integer(), "year": t.integer(), "month": t.integer()}
    ).named("DateIn")
    date_out = t.struct(
        {"day": t.integer(), "year": t.integer(), "month": t.integer()}
    ).named("DateOut")
    special_hours_in = t.struct(
        {"specialHourPeriods": t.array(g("SpecialHourPeriodIn"))}
    ).named("SpecialHoursIn")
    special_hours_out = t.struct(
        {"specialHourPeriods": t.array(g("SpecialHourPeriodOut"))}
    ).named("SpecialHoursOut")
    structured_service_item_in = t.struct(
        {"description": t.optional(t.string()), "serviceTypeId": t.string()}
    ).named("StructuredServiceItemIn")
    structured_service_item_out = t.struct(
        {"description": t.optional(t.string()), "serviceTypeId": t.string()}
    ).named("StructuredServiceItemOut")
    business_hours_in = t.struct({"periods": t.array(g("TimePeriodIn"))}).named(
        "BusinessHoursIn"
    )
    business_hours_out = t.struct({"periods": t.array(g("TimePeriodOut"))}).named(
        "BusinessHoursOut"
    )
    associate_location_request_in = t.struct({"placeId": t.string()}).named(
        "AssociateLocationRequestIn"
    )
    associate_location_request_out = t.struct({"placeId": t.string()}).named(
        "AssociateLocationRequestOut"
    )
    service_type_in = t.struct({"_": t.optional(t.any())}).named("ServiceTypeIn")
    service_type_out = t.struct(
        {"displayName": t.string(), "serviceTypeId": t.string()}
    ).named("ServiceTypeOut")
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
    time_period_in = t.struct(
        {
            "closeTime": g("TimeOfDayIn"),
            "openTime": g("TimeOfDayIn"),
            "openDay": t.string(),
            "closeDay": t.string(),
        }
    ).named("TimePeriodIn")
    time_period_out = t.struct(
        {
            "closeTime": g("TimeOfDayOut"),
            "openTime": g("TimeOfDayOut"),
            "openDay": t.string(),
            "closeDay": t.string(),
        }
    ).named("TimePeriodOut")
    attribute_value_metadata_in = t.struct(
        {"value": t.any(), "displayName": t.string()}
    ).named("AttributeValueMetadataIn")
    attribute_value_metadata_out = t.struct(
        {"value": t.any(), "displayName": t.string()}
    ).named("AttributeValueMetadataOut")
    label_in = t.struct(
        {
            "languageCode": t.optional(t.string()),
            "displayName": t.string(),
            "description": t.optional(t.string()),
        }
    ).named("LabelIn")
    label_out = t.struct(
        {
            "languageCode": t.optional(t.string()),
            "displayName": t.string(),
            "description": t.optional(t.string()),
        }
    ).named("LabelOut")
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
    special_hour_period_in = t.struct(
        {
            "closeTime": t.optional(g("TimeOfDayIn")),
            "closed": t.optional(t.boolean()),
            "openTime": t.optional(g("TimeOfDayIn")),
            "endDate": t.optional(g("DateIn")),
            "startDate": g("DateIn"),
        }
    ).named("SpecialHourPeriodIn")
    special_hour_period_out = t.struct(
        {
            "closeTime": t.optional(g("TimeOfDayOut")),
            "closed": t.optional(t.boolean()),
            "openTime": t.optional(g("TimeOfDayOut")),
            "endDate": t.optional(g("DateOut")),
            "startDate": g("DateOut"),
        }
    ).named("SpecialHourPeriodOut")
    service_area_business_in = t.struct(
        {"businessType": t.string(), "places": g("PlacesIn"), "regionCode": t.string()}
    ).named("ServiceAreaBusinessIn")
    service_area_business_out = t.struct(
        {"businessType": t.string(), "places": g("PlacesOut"), "regionCode": t.string()}
    ).named("ServiceAreaBusinessOut")
    ad_words_location_extensions_in = t.struct({"adPhone": t.string()}).named(
        "AdWordsLocationExtensionsIn"
    )
    ad_words_location_extensions_out = t.struct({"adPhone": t.string()}).named(
        "AdWordsLocationExtensionsOut"
    )
    more_hours_in = t.struct(
        {"hoursTypeId": t.string(), "periods": t.array(g("TimePeriodIn"))}
    ).named("MoreHoursIn")
    more_hours_out = t.struct(
        {"hoursTypeId": t.string(), "periods": t.array(g("TimePeriodOut"))}
    ).named("MoreHoursOut")
    batch_get_categories_response_in = t.struct(
        {"categories": t.array(g("CategoryIn"))}
    ).named("BatchGetCategoriesResponseIn")
    batch_get_categories_response_out = t.struct(
        {"categories": t.array(g("CategoryOut"))}
    ).named("BatchGetCategoriesResponseOut")
    uri_attribute_value_in = t.struct({"uri": t.string()}).named("UriAttributeValueIn")
    uri_attribute_value_out = t.struct({"uri": t.string()}).named(
        "UriAttributeValueOut"
    )
    attribute_in = t.struct(
        {
            "repeatedEnumValue": g("RepeatedEnumAttributeValueIn"),
            "values": t.array(t.any()),
            "uriValues": t.array(g("UriAttributeValueIn")),
            "name": t.string(),
        }
    ).named("AttributeIn")
    attribute_out = t.struct(
        {
            "valueType": t.string(),
            "repeatedEnumValue": g("RepeatedEnumAttributeValueOut"),
            "values": t.array(t.any()),
            "uriValues": t.array(g("UriAttributeValueOut")),
            "name": t.string(),
        }
    ).named("AttributeOut")
    search_chains_response_in = t.struct({"chains": t.array(g("ChainIn"))}).named(
        "SearchChainsResponseIn"
    )
    search_chains_response_out = t.struct({"chains": t.array(g("ChainOut"))}).named(
        "SearchChainsResponseOut"
    )
    relationship_data_in = t.struct(
        {
            "parentLocation": g("RelevantLocationIn"),
            "parentChain": t.string(),
            "childrenLocations": t.array(g("RelevantLocationIn")),
        }
    ).named("RelationshipDataIn")
    relationship_data_out = t.struct(
        {
            "parentLocation": g("RelevantLocationOut"),
            "parentChain": t.string(),
            "childrenLocations": t.array(g("RelevantLocationOut")),
        }
    ).named("RelationshipDataOut")
    money_in = t.struct(
        {"currencyCode": t.string(), "units": t.string(), "nanos": t.integer()}
    ).named("MoneyIn")
    money_out = t.struct(
        {"currencyCode": t.string(), "units": t.string(), "nanos": t.integer()}
    ).named("MoneyOut")
    free_form_service_item_in = t.struct(
        {"label": g("LabelIn"), "category": t.string()}
    ).named("FreeFormServiceItemIn")
    free_form_service_item_out = t.struct(
        {"label": g("LabelOut"), "category": t.string()}
    ).named("FreeFormServiceItemOut")
    open_info_in = t.struct(
        {"status": t.string(), "openingDate": t.optional(g("DateIn"))}
    ).named("OpenInfoIn")
    open_info_out = t.struct(
        {
            "status": t.string(),
            "canReopen": t.boolean(),
            "openingDate": t.optional(g("DateOut")),
        }
    ).named("OpenInfoOut")
    clear_location_association_request_in = t.struct({"_": t.optional(t.any())}).named(
        "ClearLocationAssociationRequestIn"
    )
    clear_location_association_request_out = t.struct({"_": t.optional(t.any())}).named(
        "ClearLocationAssociationRequestOut"
    )
    g.expose(
        locationsPatch=t.func(
            t.struct(
                {
                    "updateMask": t.string(),
                    "validateOnly": t.optional(t.boolean()),
                    "name": t.string(),
                }
            ),
            g("SearchChainsResponseOut"),
            googleapis.RestMat(
                "PATCH",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}",
                effect=effects.update(),
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
                effect=effects.create(),
            ),
        ).named("mybusinessbusinessinformation.locations.clearLocationAssociation"),
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
        locationsGet=t.func(
            t.struct(
                {
                    "requestId": t.optional(t.string()),
                    "parent": t.string(),
                    "validateOnly": t.optional(t.boolean()),
                }
            ),
            g("LocationOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}",
                effect=effects.none(),
            ),
        ).named("mybusinessbusinessinformation.locations.get"),
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
                effect=effects.update(),
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
                effect=effects.none(),
            ),
        ).named("mybusinessbusinessinformation.locations.getGoogleUpdated"),
        locationsDelete=t.func(
            t.struct(
                {
                    "name": t.string(),
                }
            ),
            g("GoogleUpdatedLocationOut"),
            googleapis.RestMat(
                "DELETE",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+name}",
                effect=effects.delete(),
            ),
        ).named("mybusinessbusinessinformation.locations.delete"),
        locationsAttributesGetGoogleUpdated=t.func(
            t.struct(
                {
                    "attributeMask": t.string(),
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
        googleLocationsSearch=t.func(
            t.struct({}),
            g("SearchGoogleLocationsResponseOut"),
            googleapis.RestMat(
                "POST",
                "https://mybusinessbusinessinformation.googleapis.com/v1/googleLocations:search",
                effect=effects.create(),
            ),
        ).named("mybusinessbusinessinformation.googleLocations.search"),
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
        categoriesList=t.func(
            t.struct(
                {
                    "pageSize": t.optional(t.integer()),
                    "filter": t.optional(t.string()),
                    "pageToken": t.optional(t.string()),
                    "view": t.string(),
                    "languageCode": t.string(),
                    "regionCode": t.string(),
                }
            ),
            g("ListCategoriesResponseOut"),
            googleapis.RestMat(
                "GET",
                "https://mybusinessbusinessinformation.googleapis.com/v1/categories",
                effect=effects.none(),
            ),
        ).named("mybusinessbusinessinformation.categories.list"),
        attributesList=t.func(
            t.struct(
                {
                    "showAll": t.boolean(),
                    "languageCode": t.string(),
                    "parent": t.string(),
                    "categoryName": t.string(),
                    "pageSize": t.integer(),
                    "regionCode": t.string(),
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
        accountsLocationsList=t.func(
            t.struct(
                {
                    "pageSize": t.optional(t.integer()),
                    "pageToken": t.optional(t.string()),
                    "parent": t.string(),
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
        accountsLocationsCreate=t.func(
            t.struct(
                {
                    "validateOnly": t.optional(t.boolean()),
                    "parent": t.string(),
                    "requestId": t.optional(t.string()),
                }
            ),
            g("LocationOut"),
            googleapis.RestMat(
                "POST",
                "https://mybusinessbusinessinformation.googleapis.com/v1/{+parent}/locations",
                effect=effects.create(),
            ),
        ).named("mybusinessbusinessinformation.accounts.locations.create"),
    )
