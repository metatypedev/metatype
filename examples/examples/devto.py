from typegraph.graphs.typegraph import TypeGraph
from typegraph.importers.openapi import import_openapi
from typegraph.materializers.http import HTTPRuntime
from typegraph.policies import allow_all
from typegraph.types import types as t

import_openapi(
    "https://raw.githubusercontent.com/APIs-guru/openapi-directory/main/APIs/dev.to/0.9.7/openapi.yaml",
    False,
)

with TypeGraph(name="devto") as g:
    remote = HTTPRuntime("https://dev.to/api")
    t.struct(
        {
            "error": t.string(),
            "status": t.integer(),
        }
    ).named("APIError")
    t.struct(
        {
            "article": t.optional(g("ArticleCreate__article")),
        }
    ).named("ArticleCreate")
    t.struct(
        {
            "body_markdown": t.optional(t.string()),
            "canonical_url": t.optional(t.string()),
            "description": t.optional(t.string()),
            "main_image": t.optional(t.string()),
            "organization_id": t.optional(t.integer()),
            "published": t.optional(t.boolean()),
            "series": t.optional(t.string()),
            "tags": t.optional(t.array(t.string())),
            "title": t.optional(t.string()),
        }
    ).named("ArticleCreate__article")
    t.struct(
        {
            "bg_color_hex": t.optional(t.string()),
            "name": t.optional(t.string()),
            "text_color_hex": t.optional(t.string()),
        }
    ).named("ArticleFlareTag")
    t.struct(
        {
            "canonical_url": t.string(),
            "comments_count": t.integer(),
            "cover_image": t.string(),
            "created_at": t.string(),
            "crossposted_at": t.string(),
            "description": t.string(),
            "edited_at": t.string(),
            "flare_tag": t.optional(g("ArticleFlareTag")),
            "id": t.integer(),
            "last_comment_at": t.string(),
            "organization": t.optional(g("SharedOrganization")),
            "path": t.string(),
            "positive_reactions_count": t.integer(),
            "public_reactions_count": t.integer(),
            "published_at": t.string(),
            "published_timestamp": t.string(),
            "readable_publish_date": t.string(),
            "reading_time_minutes": t.integer(),
            "slug": t.string(),
            "social_image": t.string(),
            "tag_list": t.array(t.string()),
            "tags": t.string(),
            "title": t.string(),
            "type_of": t.string(),
            "url": t.string(),
            "user": g("SharedUser"),
        }
    ).named("ArticleIndex")
    t.struct(
        {
            "body_markdown": t.string(),
            "canonical_url": t.string(),
            "comments_count": t.integer(),
            "cover_image": t.string(),
            "description": t.string(),
            "flare_tag": t.optional(g("ArticleFlareTag")),
            "id": t.integer(),
            "organization": t.optional(g("SharedOrganization")),
            "page_views_count": t.integer(),
            "path": t.string(),
            "positive_reactions_count": t.integer(),
            "public_reactions_count": t.integer(),
            "published": t.boolean(),
            "published_at": t.string(),
            "published_timestamp": t.string(),
            "reading_time_minutes": t.integer(),
            "slug": t.string(),
            "tag_list": t.array(t.string()),
            "title": t.string(),
            "type_of": t.string(),
            "url": t.string(),
            "user": g("SharedUser"),
        }
    ).named("ArticleMe")
    t.struct(
        {
            "body_html": t.string(),
            "body_markdown": t.string(),
            "canonical_url": t.string(),
            "comments_count": t.integer(),
            "cover_image": t.string(),
            "created_at": t.string(),
            "crossposted_at": t.string(),
            "description": t.string(),
            "edited_at": t.string(),
            "flare_tag": t.optional(g("ArticleFlareTag")),
            "id": t.integer(),
            "last_comment_at": t.string(),
            "organization": t.optional(g("SharedOrganization")),
            "path": t.string(),
            "positive_reactions_count": t.integer(),
            "public_reactions_count": t.integer(),
            "published_at": t.string(),
            "published_timestamp": t.string(),
            "readable_publish_date": t.string(),
            "reading_time_minutes": t.integer(),
            "slug": t.string(),
            "social_image": t.string(),
            "tag_list": t.string(),
            "tags": t.array(t.string()),
            "title": t.string(),
            "type_of": t.string(),
            "url": t.string(),
            "user": g("SharedUser"),
        }
    ).named("ArticleShow")
    t.struct(
        {
            "article": t.optional(g("ArticleUpdate__article")),
        }
    ).named("ArticleUpdate")
    t.struct(
        {
            "body_markdown": t.optional(t.string()),
            "canonical_url": t.optional(t.string()),
            "description": t.optional(t.string()),
            "main_image": t.optional(t.string()),
            "organization_id": t.optional(t.integer()),
            "published": t.optional(t.boolean()),
            "series": t.optional(t.string()),
            "tags": t.optional(t.array(t.string())),
            "title": t.optional(t.string()),
        }
    ).named("ArticleUpdate__article")
    t.struct(
        {
            "cloudinary_video_url": t.string(),
            "id": t.integer(),
            "path": t.string(),
            "title": t.string(),
            "type_of": t.string(),
            "user": g("ArticleVideo__user"),
            "user_id": t.integer(),
            "video_duration_in_minutes": t.string(),
            "video_source_url": t.string(),
        }
    ).named("ArticleVideo")
    t.struct(
        {
            "name": t.optional(t.string()),
        }
    ).named("ArticleVideo__user")
    t.struct(
        {
            "body_html": t.string(),
            "children": t.array(g("Comment")),
            "created_at": t.string(),
            "id_code": t.string(),
            "type_of": t.string(),
            "user": g("SharedUser"),
        }
    ).named("Comment")
    t.struct(
        {
            "id": t.integer(),
            "name": t.string(),
            "points": t.float(),
        }
    ).named("FollowedTag")
    t.struct(
        {
            "created_at": t.string(),
            "id": t.integer(),
            "name": t.string(),
            "path": t.string(),
            "profile_image": t.string(),
            "type_of": t.string(),
            "username": t.string(),
        }
    ).named("Follower")
    t.struct(
        {
            "body_markdown": t.string(),
            "category": g("ListingCategory"),
            "id": t.integer(),
            "organization": t.optional(g("SharedOrganization")),
            "processed_html": t.string(),
            "published": t.boolean(),
            "slug": t.string(),
            "tag_list": t.string(),
            "tags": t.array(t.string()),
            "title": t.string(),
            "type_of": t.string(),
            "user": g("SharedUser"),
        }
    ).named("Listing")
    t.string().named("ListingCategory")
    t.struct(
        {
            "listing": t.optional(g("ListingCreate__listing")),
        }
    ).named("ListingCreate")
    t.struct(
        {
            "action": t.optional(t.string()),
            "body_markdown": t.string(),
            "category": g("ListingCategory"),
            "contact_via_connect": t.optional(t.boolean()),
            "expires_at": t.optional(t.string()),
            "location": t.optional(t.string()),
            "organization_id": t.optional(t.integer()),
            "tag_list": t.optional(t.string()),
            "tags": t.optional(t.array(t.string())),
            "title": t.string(),
        }
    ).named("ListingCreate__listing")
    t.struct(
        {
            "listing": t.optional(g("ListingUpdate__listing")),
        }
    ).named("ListingUpdate")
    t.struct(
        {
            "action": t.optional(t.string()),
            "body_markdown": t.optional(t.string()),
            "category": t.optional(g("ListingCategory")),
            "contact_via_connect": t.optional(t.boolean()),
            "expires_at": t.optional(t.string()),
            "location": t.optional(t.string()),
            "tag_list": t.optional(t.string()),
            "tags": t.optional(t.array(t.string())),
            "title": t.optional(t.string()),
        }
    ).named("ListingUpdate__listing")
    t.struct(
        {
            "github_username": t.optional(t.string()),
            "joined_at": t.optional(t.string()),
            "location": t.optional(t.string()),
            "name": t.optional(t.string()),
            "profile_image": t.optional(t.string()),
            "story": t.optional(t.string()),
            "summary": t.optional(t.string()),
            "tag_line": t.optional(t.string()),
            "tech_stack": t.optional(t.string()),
            "twitter_username": t.optional(t.string()),
            "type_of": t.optional(t.string()),
            "url": t.optional(t.string()),
            "username": t.optional(t.string()),
        }
    ).named("Organization")
    t.struct(
        {
            "id": t.integer(),
            "image_url": t.string(),
            "path": t.string(),
            "podcast": g("PodcastEpisode__podcast"),
            "title": t.string(),
            "type_of": t.string(),
        }
    ).named("PodcastEpisode")
    t.struct(
        {
            "image_url": t.optional(t.string()),
            "slug": t.optional(t.string()),
            "title": t.optional(t.string()),
        }
    ).named("PodcastEpisode__podcast")
    t.struct(
        {
            "image_of": t.optional(t.string()),
            "profile_image": t.optional(t.string()),
            "profile_image_90": t.optional(t.string()),
            "type_of": t.optional(t.string()),
        }
    ).named("ProfileImage")
    t.struct(
        {
            "article": g("ArticleIndex"),
            "created_at": t.string(),
            "id": t.integer(),
            "status": t.string(),
            "type_of": t.string(),
        }
    ).named("ReadingList")
    t.struct(
        {
            "name": t.optional(t.string()),
            "profile_image": t.optional(t.string()),
            "profile_image_90": t.optional(t.string()),
            "slug": t.optional(t.string()),
            "username": t.optional(t.string()),
        }
    ).named("SharedOrganization")
    t.struct(
        {
            "github_username": t.optional(t.string()),
            "name": t.optional(t.string()),
            "profile_image": t.optional(t.string()),
            "profile_image_90": t.optional(t.string()),
            "twitter_username": t.optional(t.string()),
            "username": t.optional(t.string()),
            "website_url": t.optional(t.string()),
        }
    ).named("SharedUser")
    t.struct(
        {
            "bg_color_hex": t.string(),
            "id": t.integer(),
            "name": t.string(),
            "text_color_hex": t.string(),
        }
    ).named("Tag")
    t.struct(
        {
            "github_username": t.string(),
            "id": t.integer(),
            "joined_at": t.string(),
            "location": t.string(),
            "name": t.string(),
            "profile_image": t.string(),
            "summary": t.string(),
            "twitter_username": t.string(),
            "type_of": t.string(),
            "username": t.string(),
            "website_url": t.string(),
        }
    ).named("User")
    t.struct(
        {
            "webhook_endpoint": t.optional(g("WebhookCreate__webhook_endpoint")),
        }
    ).named("WebhookCreate")
    t.struct(
        {
            "events": t.array(t.string()),
            "source": t.string(),
            "target_url": t.string(),
        }
    ).named("WebhookCreate__webhook_endpoint")
    t.struct(
        {
            "created_at": t.optional(t.string()),
            "events": t.optional(t.array(t.string())),
            "id": t.optional(t.integer()),
            "source": t.optional(t.string()),
            "target_url": t.optional(t.string()),
            "type_of": t.optional(t.string()),
        }
    ).named("WebhookIndex")
    t.struct(
        {
            "created_at": t.optional(t.string()),
            "events": t.optional(t.array(t.string())),
            "id": t.optional(t.integer()),
            "source": t.optional(t.string()),
            "target_url": t.optional(t.string()),
            "type_of": t.optional(t.string()),
            "user": t.optional(g("SharedUser")),
        }
    ).named("WebhookShow")
    g.expose(
        getArticles=remote.get(
            "/articles",
            t.struct(
                {
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                    "tag": t.optional(t.string()),
                    "tags": t.optional(t.string()),
                    "tags_exclude": t.optional(t.string()),
                    "username": t.optional(t.string()),
                    "state": t.optional(t.string()),
                    "top": t.optional(t.integer()),
                    "collection_id": t.optional(t.integer()),
                }
            ),
            t.array(g("ArticleIndex")),
        ).add_policy(allow_all()),
        createArticle=remote.post(
            "/articles",
            t.struct(
                {
                    "article": t.optional(g("ArticleCreate__article")),
                }
            ),
            g("ArticleShow"),
            content_type="application/json",
            body_fields=("article",),
        ).add_policy(allow_all()),
        getLatestArticles=remote.get(
            "/articles/latest",
            t.struct(
                {
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                }
            ),
            t.array(g("ArticleIndex")),
        ).add_policy(allow_all()),
        getUserArticles=remote.get(
            "/articles/me",
            t.struct(
                {
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                }
            ),
            t.array(g("ArticleMe")),
        ).add_policy(allow_all()),
        getUserAllArticles=remote.get(
            "/articles/me/all",
            t.struct(
                {
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                }
            ),
            t.array(g("ArticleMe")),
        ).add_policy(allow_all()),
        getUserPublishedArticles=remote.get(
            "/articles/me/published",
            t.struct(
                {
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                }
            ),
            t.array(g("ArticleMe")),
        ).add_policy(allow_all()),
        getUserUnpublishedArticles=remote.get(
            "/articles/me/unpublished",
            t.struct(
                {
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                }
            ),
            t.array(g("ArticleMe")),
        ).add_policy(allow_all()),
        getArticleById=remote.get(
            "/articles/{id}",
            t.struct(
                {
                    "id": t.integer(),
                }
            ),
            t.optional(g("ArticleShow")),
        ).add_policy(allow_all()),
        updateArticle=remote.put(
            "/articles/{id}",
            t.struct(
                {
                    "id": t.integer(),
                    "article": t.optional(g("ArticleUpdate__article")),
                }
            ),
            g("ArticleShow"),
            content_type="application/json",
            body_fields=("article",),
        ).add_policy(allow_all()),
        getArticleByPath=remote.get(
            "/articles/{username}/{slug}",
            t.struct(
                {
                    "username": t.string(),
                    "slug": t.string(),
                }
            ),
            t.optional(g("ArticleShow")),
        ).add_policy(allow_all()),
        getCommentsByArticleId=remote.get(
            "/comments",
            t.struct(
                {
                    "a_id": t.optional(t.integer()),
                    "p_id": t.optional(t.integer()),
                }
            ),
            t.optional(t.array(g("Comment"))),
        ).add_policy(allow_all()),
        getCommentById=remote.get(
            "/comments/{id}",
            t.struct(
                {
                    "id": t.string(),
                }
            ),
            t.optional(g("Comment")),
        ).add_policy(allow_all()),
        getFollowers=remote.get(
            "/followers/users",
            t.struct(
                {
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                    "sort": t.optional(t.string()),
                }
            ),
            t.array(g("Follower")),
        ).add_policy(allow_all()),
        getFollowedTags=remote.get(
            "/follows/tags",
            t.struct({}),
            t.array(g("FollowedTag")),
        ).add_policy(allow_all()),
        getListings=remote.get(
            "/listings",
            t.struct(
                {
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                    "category": t.optional(t.string()),
                }
            ),
            t.array(g("Listing")),
        ).add_policy(allow_all()),
        createListing=remote.post(
            "/listings",
            t.struct(
                {
                    "listing": t.optional(g("ListingCreate__listing")),
                }
            ),
            g("Listing"),
            content_type="application/json",
            body_fields=("listing",),
        ).add_policy(allow_all()),
        getListingsByCategory=remote.get(
            "/listings/category/{category}",
            t.struct(
                {
                    "category": g("ListingCategory"),
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                }
            ),
            t.array(g("Listing")),
        ).add_policy(allow_all()),
        getListingById=remote.get(
            "/listings/{id}",
            t.struct(
                {
                    "id": t.integer(),
                }
            ),
            t.optional(g("Listing")),
        ).add_policy(allow_all()),
        updateListing=remote.put(
            "/listings/{id}",
            t.struct(
                {
                    "id": t.integer(),
                    "listing": t.optional(g("ListingUpdate__listing")),
                }
            ),
            g("ArticleShow"),
            content_type="application/json",
            body_fields=("listing",),
        ).add_policy(allow_all()),
        getOrganization=remote.get(
            "/organizations/{username}",
            t.struct(
                {
                    "username": t.string(),
                }
            ),
            t.optional(g("Organization")),
        ).add_policy(allow_all()),
        getOrgArticles=remote.get(
            "/organizations/{username}/articles",
            t.struct(
                {
                    "username": t.string(),
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                }
            ),
            t.optional(t.array(g("ArticleIndex"))),
        ).add_policy(allow_all()),
        getOrgListings=remote.get(
            "/organizations/{username}/listings",
            t.struct(
                {
                    "username": t.string(),
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                    "category": t.optional(t.string()),
                }
            ),
            t.optional(
                t.array(
                    t.struct(
                        {
                            "body_markdown": t.string(),
                            "category": g("ListingCategory"),
                            "id": t.integer(),
                            "organization": g("SharedOrganization"),
                            "processed_html": t.string(),
                            "published": t.boolean(),
                            "slug": t.string(),
                            "tag_list": t.string(),
                            "tags": t.array(t.string()),
                            "title": t.string(),
                            "type_of": t.string(),
                            "user": g("SharedUser"),
                        }
                    )
                )
            ),
        ).add_policy(allow_all()),
        getOrgUsers=remote.get(
            "/organizations/{username}/users",
            t.struct(
                {
                    "username": t.string(),
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                }
            ),
            t.optional(t.array(g("User"))),
        ).add_policy(allow_all()),
        getPodcastEpisodes=remote.get(
            "/podcast_episodes",
            t.struct(
                {
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                    "username": t.optional(t.string()),
                }
            ),
            t.optional(t.array(g("PodcastEpisode"))),
        ).add_policy(allow_all()),
        getProfileImage=remote.get(
            "/profile_images/{username}",
            t.struct(
                {
                    "username": t.string(),
                }
            ),
            t.optional(g("ProfileImage")),
        ).add_policy(allow_all()),
        getReadinglist=remote.get(
            "/readinglist",
            t.struct(
                {
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                }
            ),
            t.array(g("ReadingList")),
        ).add_policy(allow_all()),
        getTags=remote.get(
            "/tags",
            t.struct(
                {
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                }
            ),
            t.array(g("Tag")),
        ).add_policy(allow_all()),
        getUserMe=remote.get(
            "/users/me",
            t.struct({}),
            g("User"),
        ).add_policy(allow_all()),
        getUser=remote.get(
            "/users/{id}",
            t.struct(
                {
                    "id": t.string(),
                    "url": t.optional(t.string()),
                }
            ),
            t.optional(g("User")),
        ).add_policy(allow_all()),
        getArticlesWithVideo=remote.get(
            "/videos",
            t.struct(
                {
                    "page": t.optional(t.integer()),
                    "per_page": t.optional(t.integer()),
                }
            ),
            t.array(g("ArticleVideo")),
        ).add_policy(allow_all()),
        getWebhooks=remote.get(
            "/webhooks",
            t.struct({}),
            t.array(g("WebhookIndex")),
        ).add_policy(allow_all()),
        createWebhook=remote.post(
            "/webhooks",
            t.struct(
                {
                    "webhook_endpoint": t.optional(
                        g("WebhookCreate__webhook_endpoint")
                    ),
                }
            ),
            g("WebhookShow"),
            content_type="application/json",
            body_fields=("webhook_endpoint",),
        ).add_policy(allow_all()),
        getWebhookById=remote.get(
            "/webhooks/{id}",
            t.struct(
                {
                    "id": t.integer(),
                }
            ),
            t.optional(g("WebhookShow")),
        ).add_policy(allow_all()),
        deleteWebhook=remote.delete(
            "/webhooks/{id}",
            t.struct(
                {
                    "id": t.integer(),
                }
            ),
            t.optional(t.boolean()),
        ).add_policy(allow_all()),
    )
