from typegraph import t
from typegraph import TypeGraph
from typegraph.importers.openapi import OpenApiImporter
from typegraph.runtimes.http import HTTPRuntime


OpenApiImporter(
    "devto",
    url="https://raw.githubusercontent.com/APIs-guru/openapi-directory/main/APIs/dev.to/0.9.7/openapi.yaml",
).imp(False)

with TypeGraph(name="devto") as g:
    devto = HTTPRuntime("https://dev.to/api")

    t.struct({"error": t.string(), "status": t.integer()}).named("APIError")
    t.struct(
        {
            "article": t.struct(
                {
                    "body_markdown": t.string(),
                    "canonical_url": t.string(),
                    "description": t.string(),
                    "main_image": t.string(),
                    "organization_id": t.integer(),
                    "published": t.boolean(),
                    "series": t.string(),
                    "tags": t.array(t.string()),
                    "title": t.string(),
                }
            )
        }
    ).named("ArticleCreate")
    t.struct(
        {"bg_color_hex": t.string(), "name": t.string(), "text_color_hex": t.string()}
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
            "flare_tag": g("ArticleFlareTag"),
            "id": t.integer(),
            "last_comment_at": t.string(),
            "organization": g("SharedOrganization"),
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
            "flare_tag": g("ArticleFlareTag"),
            "id": t.integer(),
            "organization": g("SharedOrganization"),
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
            "flare_tag": g("ArticleFlareTag"),
            "id": t.integer(),
            "last_comment_at": t.string(),
            "organization": g("SharedOrganization"),
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
            "article": t.struct(
                {
                    "body_markdown": t.string(),
                    "canonical_url": t.string(),
                    "description": t.string(),
                    "main_image": t.string(),
                    "organization_id": t.integer(),
                    "published": t.boolean(),
                    "series": t.string(),
                    "tags": t.array(t.string()),
                    "title": t.string(),
                }
            )
        }
    ).named("ArticleUpdate")
    t.struct(
        {
            "cloudinary_video_url": t.string(),
            "id": t.integer(),
            "path": t.string(),
            "title": t.string(),
            "type_of": t.string(),
            "user": t.struct({"name": t.string()}),
            "user_id": t.integer(),
            "video_duration_in_minutes": t.string(),
            "video_source_url": t.string(),
        }
    ).named("ArticleVideo")
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
    t.struct({"id": t.integer(), "name": t.string(), "points": t.number()}).named(
        "FollowedTag"
    )
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
    ).named("Listing")
    t.string().named("ListingCategory")
    t.struct(
        {
            "listing": t.struct(
                {
                    "action": t.string(),
                    "body_markdown": t.string(),
                    "category": g("ListingCategory"),
                    "contact_via_connect": t.boolean(),
                    "expires_at": t.string(),
                    "location": t.string(),
                    "organization_id": t.integer(),
                    "tag_list": t.string(),
                    "tags": t.array(t.string()),
                    "title": t.string(),
                }
            )
        }
    ).named("ListingCreate")
    t.struct(
        {
            "listing": t.struct(
                {
                    "action": t.string(),
                    "body_markdown": t.string(),
                    "category": g("ListingCategory"),
                    "contact_via_connect": t.boolean(),
                    "expires_at": t.string(),
                    "location": t.string(),
                    "tag_list": t.string(),
                    "tags": t.array(t.string()),
                    "title": t.string(),
                }
            )
        }
    ).named("ListingUpdate")
    t.struct(
        {
            "github_username": t.string(),
            "joined_at": t.string(),
            "location": t.string(),
            "name": t.string(),
            "profile_image": t.string(),
            "story": t.string(),
            "summary": t.string(),
            "tag_line": t.string(),
            "tech_stack": t.string(),
            "twitter_username": t.string(),
            "type_of": t.string(),
            "url": t.string(),
            "username": t.string(),
        }
    ).named("Organization")
    t.struct(
        {
            "id": t.integer(),
            "image_url": t.string(),
            "path": t.string(),
            "podcast": t.struct(
                {"image_url": t.string(), "slug": t.string(), "title": t.string()}
            ),
            "title": t.string(),
            "type_of": t.string(),
        }
    ).named("PodcastEpisode")
    t.struct(
        {
            "image_of": t.string(),
            "profile_image": t.string(),
            "profile_image_90": t.string(),
            "type_of": t.string(),
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
            "name": t.string(),
            "profile_image": t.string(),
            "profile_image_90": t.string(),
            "slug": t.string(),
            "username": t.string(),
        }
    ).named("SharedOrganization")
    t.struct(
        {
            "github_username": t.string(),
            "name": t.string(),
            "profile_image": t.string(),
            "profile_image_90": t.string(),
            "twitter_username": t.string(),
            "username": t.string(),
            "website_url": t.string(),
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
            "webhook_endpoint": t.struct(
                {
                    "events": t.array(t.string()),
                    "source": t.string(),
                    "target_url": t.string(),
                }
            )
        }
    ).named("WebhookCreate")
    t.struct(
        {
            "created_at": t.string(),
            "events": t.array(t.string()),
            "id": t.integer(),
            "source": t.string(),
            "target_url": t.string(),
            "type_of": t.string(),
        }
    ).named("WebhookIndex")
    t.struct(
        {
            "created_at": t.string(),
            "events": t.array(t.string()),
            "id": t.integer(),
            "source": t.string(),
            "target_url": t.string(),
            "type_of": t.string(),
            "user": g("SharedUser"),
        }
    ).named("WebhookShow")

    g.expose(
        getArticles=devto.get(
            "/articles",
            t.struct(
                {
                    "page": t.integer(),
                    "per_page": t.integer(),
                    "tag": t.string(),
                    "tags": t.string(),
                    "tags_exclude": t.string(),
                    "username": t.string(),
                    "state": t.string(),
                    "top": t.integer(),
                    "collection_id": t.integer(),
                }
            ),
            t.array(g("ArticleIndex")),
        ),
        createArticle=devto.post(
            "/articles",
            t.struct(
                {
                    "article": t.struct(
                        {
                            "body_markdown": t.string(),
                            "canonical_url": t.string(),
                            "description": t.string(),
                            "main_image": t.string(),
                            "organization_id": t.integer(),
                            "published": t.boolean(),
                            "series": t.string(),
                            "tags": t.array(t.string()),
                            "title": t.string(),
                        }
                    )
                }
            ),
            g("ArticleShow"),
            content_type="application/json",
            body_fields=("article",),
        ),
        getLatestArticles=devto.get(
            "/articles/latest",
            t.struct({"page": t.integer(), "per_page": t.integer()}),
            t.array(g("ArticleIndex")),
        ),
        getUserArticles=devto.get(
            "/articles/me",
            t.struct({"page": t.integer(), "per_page": t.integer()}),
            t.array(g("ArticleMe")),
        ),
        getUserAllArticles=devto.get(
            "/articles/me/all",
            t.struct({"page": t.integer(), "per_page": t.integer()}),
            t.array(g("ArticleMe")),
        ),
        getUserPublishedArticles=devto.get(
            "/articles/me/published",
            t.struct({"page": t.integer(), "per_page": t.integer()}),
            t.array(g("ArticleMe")),
        ),
        getUserUnpublishedArticles=devto.get(
            "/articles/me/unpublished",
            t.struct({"page": t.integer(), "per_page": t.integer()}),
            t.array(g("ArticleMe")),
        ),
        getArticleById=devto.get(
            "/articles/{id}",
            t.struct({"id": t.integer()}),
            g("ArticleShow").optional(),
        ),
        updateArticle=devto.put(
            "/articles/{id}",
            t.struct(
                {
                    "id": t.integer(),
                    "article": t.struct(
                        {
                            "body_markdown": t.string(),
                            "canonical_url": t.string(),
                            "description": t.string(),
                            "main_image": t.string(),
                            "organization_id": t.integer(),
                            "published": t.boolean(),
                            "series": t.string(),
                            "tags": t.array(t.string()),
                            "title": t.string(),
                        }
                    ),
                }
            ),
            g("ArticleShow"),
            content_type="application/json",
            body_fields=("article",),
        ),
        getArticleByPath=devto.get(
            "/articles/{username}/{slug}",
            t.struct({"username": t.string(), "slug": t.string()}),
            g("ArticleShow").optional(),
        ),
        getCommentsByArticleId=devto.get(
            "/comments",
            t.struct({"a_id": t.integer(), "p_id": t.integer()}),
            t.array(g("Comment")).optional(),
        ),
        getCommentById=devto.get(
            "/comments/{id}",
            t.struct({"id": t.string()}),
            g("Comment").optional(),
        ),
        getFollowers=devto.get(
            "/followers/users",
            t.struct(
                {"page": t.integer(), "per_page": t.integer(), "sort": t.string()}
            ),
            t.array(g("Follower")),
        ),
        getFollowedTags=devto.get(
            "/follows/tags",
            t.struct({}),
            t.array(g("FollowedTag")),
        ),
        getListings=devto.get(
            "/listings",
            t.struct(
                {"page": t.integer(), "per_page": t.integer(), "category": t.string()}
            ),
            t.array(g("Listing")),
        ),
        createListing=devto.post(
            "/listings",
            t.struct(
                {
                    "listing": t.struct(
                        {
                            "action": t.string(),
                            "body_markdown": t.string(),
                            "category": g("ListingCategory"),
                            "contact_via_connect": t.boolean(),
                            "expires_at": t.string(),
                            "location": t.string(),
                            "organization_id": t.integer(),
                            "tag_list": t.string(),
                            "tags": t.array(t.string()),
                            "title": t.string(),
                        }
                    )
                }
            ),
            g("Listing"),
            content_type="application/json",
            body_fields=("listing",),
        ),
        getListingsByCategory=devto.get(
            "/listings/category/{category}",
            t.struct(
                {
                    "category": g("ListingCategory"),
                    "page": t.integer(),
                    "per_page": t.integer(),
                }
            ),
            t.array(g("Listing")),
        ),
        getListingById=devto.get(
            "/listings/{id}",
            t.struct({"id": t.integer()}),
            g("Listing").optional(),
        ),
        updateListing=devto.put(
            "/listings/{id}",
            t.struct(
                {
                    "id": t.integer(),
                    "listing": t.struct(
                        {
                            "action": t.string(),
                            "body_markdown": t.string(),
                            "category": g("ListingCategory"),
                            "contact_via_connect": t.boolean(),
                            "expires_at": t.string(),
                            "location": t.string(),
                            "tag_list": t.string(),
                            "tags": t.array(t.string()),
                            "title": t.string(),
                        }
                    ),
                }
            ),
            g("ArticleShow"),
            content_type="application/json",
            body_fields=("listing",),
        ),
        getOrganization=devto.get(
            "/organizations/{username}",
            t.struct({"username": t.string()}),
            g("Organization").optional(),
        ),
        getOrgArticles=devto.get(
            "/organizations/{username}/articles",
            t.struct(
                {"username": t.string(), "page": t.integer(), "per_page": t.integer()}
            ),
            t.array(g("ArticleIndex")).optional(),
        ),
        getOrgListings=devto.get(
            "/organizations/{username}/listings",
            t.struct(
                {
                    "username": t.string(),
                    "page": t.integer(),
                    "per_page": t.integer(),
                    "category": t.string(),
                }
            ),
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
            ).optional(),
        ),
        getOrgUsers=devto.get(
            "/organizations/{username}/users",
            t.struct(
                {"username": t.string(), "page": t.integer(), "per_page": t.integer()}
            ),
            t.array(g("User")).optional(),
        ),
        getPodcastEpisodes=devto.get(
            "/podcast_episodes",
            t.struct(
                {"page": t.integer(), "per_page": t.integer(), "username": t.string()}
            ),
            t.array(g("PodcastEpisode")).optional(),
        ),
        getProfileImage=devto.get(
            "/profile_images/{username}",
            t.struct({"username": t.string()}),
            g("ProfileImage").optional(),
        ),
        getReadinglist=devto.get(
            "/readinglist",
            t.struct({"page": t.integer(), "per_page": t.integer()}),
            t.array(g("ReadingList")),
        ),
        getTags=devto.get(
            "/tags",
            t.struct({"page": t.integer(), "per_page": t.integer()}),
            t.array(g("Tag")),
        ),
        getUserMe=devto.get(
            "/users/me",
            t.struct({}),
            g("User"),
        ),
        getUser=devto.get(
            "/users/{id}",
            t.struct({"id": t.string(), "url": t.string()}),
            g("User").optional(),
        ),
        getArticlesWithVideo=devto.get(
            "/videos",
            t.struct({"page": t.integer(), "per_page": t.integer()}),
            t.array(g("ArticleVideo")),
        ),
        getWebhooks=devto.get(
            "/webhooks",
            t.struct({}),
            t.array(g("WebhookIndex")),
        ),
        createWebhook=devto.post(
            "/webhooks",
            t.struct(
                {
                    "webhook_endpoint": t.struct(
                        {
                            "events": t.array(t.string()),
                            "source": t.string(),
                            "target_url": t.string(),
                        }
                    )
                }
            ),
            g("WebhookShow"),
            content_type="application/json",
            body_fields=("webhook_endpoint",),
        ),
        deleteWebhook=devto.delete(
            "/webhooks/{id}",
            t.struct({"id": t.integer()}),
            t.boolean().optional(),
        ),
        getWebhookById=devto.get(
            "/webhooks/{id}",
            t.struct({"id": t.integer()}),
            g("WebhookShow").optional(),
        ),
    )
