from typegraph.utils.sanitizers import inject_params
from box import Box
from typegraph import TypeGraph, policies, t
from typegraph.importers.base.importer import Import
from typegraph.importers.openapi import OpenApiImporter
from typegraph.runtimes.http import HTTPRuntime

OpenApiImporter(
    "devto",
    url="https://raw.githubusercontent.com/APIs-guru/openapi-directory/main/APIs/dev.to/1.0.0/openapi.yaml",
).imp(False)


# Function generated by OpenApiImporter. Do not change.
def import_devto(params=None):
    target_url = inject_params("https://dev.to/api", params)
    devto = HTTPRuntime(target_url)

    # skip:start
    renames = {
        "Article": "_devto_1_Article",
        "ArticleFlareTag": "_devto_2_ArticleFlareTag",
        "ArticleIndex": "_devto_3_ArticleIndex",
        "Comment": "_devto_4_Comment",
        "DisplayAd": "_devto_5_DisplayAd",
        "FollowedTag": "_devto_6_FollowedTag",
        "Organization": "_devto_7_Organization",
        "Page": "_devto_8_Page",
        "PodcastEpisodeIndex": "_devto_9_PodcastEpisodeIndex",
        "ProfileImage": "_devto_10_ProfileImage",
        "SharedOrganization": "_devto_11_SharedOrganization",
        "SharedPodcast": "_devto_12_SharedPodcast",
        "SharedUser": "_devto_13_SharedUser",
        "Tag": "_devto_14_Tag",
        "User": "_devto_15_User",
        "UserInviteParam": "_devto_16_UserInviteParam",
        "VideoArticle": "_devto_17_VideoArticle",
    }

    types = {}
    types["Article"] = t.struct(
        {
            "article": t.struct(
                {
                    "body_markdown": t.string().optional(),
                    "canonical_url": t.string().optional(),
                    "description": t.string().optional(),
                    "main_image": t.string().optional(),
                    "organization_id": t.integer().optional(),
                    "published": t.boolean().optional(),
                    "series": t.string().optional(),
                    "tags": t.string().optional(),
                    "title": t.string().optional(),
                }
            ).optional()
        }
    ).named(renames["Article"])
    types["ArticleFlareTag"] = t.struct(
        {
            "bg_color_hex": t.string().optional(),
            "name": t.string().optional(),
            "text_color_hex": t.string().optional(),
        }
    ).named(renames["ArticleFlareTag"])
    # skip:end
    # ...
    types["ArticleIndex"] = t.struct(
        {
            "canonical_url": t.string(),
            "cover_image": t.string().optional(),
            "created_at": t.string(),
            "crossposted_at": t.string().optional(),
            "description": t.string(),
            "edited_at": t.string().optional(),
            "flare_tag": t.proxy(renames["ArticleFlareTag"]).optional(),
            "id": t.integer(),
            "last_comment_at": t.string(),
            "organization": t.proxy(renames["SharedOrganization"]).optional(),
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
            "user": t.proxy(renames["SharedUser"]),
        }
    ).named(renames["ArticleIndex"])
    # skip:start
    types["Comment"] = t.struct(
        {
            "created_at": t.string().optional(),
            "id_code": t.string().optional(),
            "image_url": t.string().optional(),
            "type_of": t.string().optional(),
        }
    ).named(renames["Comment"])
    types["DisplayAd"] = t.struct(
        {
            "approved": t.boolean().optional(),
            "article_exclude_ids": t.string().optional(),
            "body_markdown": t.string(),
            "creator_id": t.integer().optional(),
            "display_to": t.string().optional(),
            "id": t.integer().optional(),
            "name": t.string(),
            "organization_id": t.integer().optional(),
            "placement_area": t.string(),
            "published": t.boolean().optional(),
            "tag_list": t.string().optional(),
            "type_of": t.string().optional(),
        }
    ).named(renames["DisplayAd"])
    types["FollowedTag"] = t.struct(
        {"id": t.integer(), "name": t.string(), "points": t.number()}
    ).named(renames["FollowedTag"])
    types["Organization"] = t.struct(
        {
            "github_username": t.string().optional(),
            "joined_at": t.string().optional(),
            "location": t.string().optional(),
            "name": t.string().optional(),
            "story": t.string().optional(),
            "summary": t.string().optional(),
            "tag_line": t.string().optional(),
            "tech_stack": t.string().optional(),
            "twitter_username": t.string().optional(),
            "type_of": t.string().optional(),
            "url": t.string().optional(),
            "username": t.string().optional(),
        }
    ).named(renames["Organization"])
    types["Page"] = t.struct(
        {
            "body_json": t.string().optional(),
            "body_markdown": t.string().optional(),
            "description": t.string(),
            "is_top_level_path": t.boolean().optional(),
            "slug": t.string(),
            "social_image": t.struct({}).optional(),
            "template": t.string(),
            "title": t.string(),
        }
    ).named(renames["Page"])
    types["PodcastEpisodeIndex"] = t.struct(
        {
            "class_name": t.string(),
            "id": t.integer(),
            "image_url": t.string(),
            "path": t.string(),
            "podcast": t.proxy(renames["SharedPodcast"]),
            "title": t.string(),
            "type_of": t.string(),
        }
    ).named(renames["PodcastEpisodeIndex"])
    types["ProfileImage"] = t.struct(
        {
            "image_of": t.string().optional(),
            "profile_image": t.string().optional(),
            "profile_image_90": t.string().optional(),
            "type_of": t.string().optional(),
        }
    ).named(renames["ProfileImage"])
    types["SharedOrganization"] = t.struct(
        {
            "name": t.string().optional(),
            "profile_image": t.string().optional(),
            "profile_image_90": t.string().optional(),
            "slug": t.string().optional(),
            "username": t.string().optional(),
        }
    ).named(renames["SharedOrganization"])
    types["SharedPodcast"] = t.struct(
        {
            "image_url": t.string().optional(),
            "slug": t.string().optional(),
            "title": t.string().optional(),
        }
    ).named(renames["SharedPodcast"])
    types["SharedUser"] = t.struct(
        {
            "github_username": t.string().optional(),
            "name": t.string().optional(),
            "profile_image": t.string().optional(),
            "profile_image_90": t.string().optional(),
            "twitter_username": t.string().optional(),
            "username": t.string().optional(),
            "website_url": t.string().optional(),
        }
    ).named(renames["SharedUser"])
    types["Tag"] = t.struct(
        {
            "bg_color_hex": t.string().optional(),
            "id": t.integer().optional(),
            "name": t.string().optional(),
            "text_color_hex": t.string().optional(),
        }
    ).named(renames["Tag"])
    types["User"] = t.struct(
        {
            "github_username": t.string().optional(),
            "id": t.integer().optional(),
            "joined_at": t.string().optional(),
            "location": t.string().optional(),
            "name": t.string().optional(),
            "profile_image": t.string().optional(),
            "summary": t.string().optional(),
            "twitter_username": t.string().optional(),
            "type_of": t.string().optional(),
            "username": t.string().optional(),
            "website_url": t.string().optional(),
        }
    ).named(renames["User"])
    types["UserInviteParam"] = t.struct(
        {"email": t.string().optional(), "name": t.string().optional()}
    ).named(renames["UserInviteParam"])
    types["VideoArticle"] = t.struct(
        {
            "cloudinary_video_url": t.string().optional(),
            "id": t.integer().optional(),
            "path": t.string().optional(),
            "title": t.string().optional(),
            "type_of": t.string().optional(),
            "user": t.struct({"name": t.string().optional()}).optional(),
            "user_id": t.integer().optional(),
            "video_duration_in_minutes": t.string().optional(),
            "video_source_url": t.string().optional(),
        }
    ).named(renames["VideoArticle"])

    functions = {}
    functions["postAdminUsersCreate"] = devto.post(
        "/api/admin/users",
        t.struct({"email": t.string().optional(), "name": t.string().optional()}),
        t.struct({}),
        content_type="application/json",
        body_fields=("email", "name"),
    )
    functions["getArticles"] = devto.get(
        "/api/articles",
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
        t.array(t.proxy(renames["ArticleIndex"])),
    )
    # skip:end
    # ...
    functions["getLatestArticles"] = devto.get(
        "/api/articles/latest",
        t.struct({"page": t.integer(), "per_page": t.integer()}),
        t.array(t.proxy(renames["ArticleIndex"])),
    )
    # skip:start
    functions["getUserArticles"] = devto.get(
        "/api/articles/me",
        t.struct({"page": t.integer(), "per_page": t.integer()}),
        t.array(t.proxy(renames["ArticleIndex"])),
    )
    functions["getUserAllArticles"] = devto.get(
        "/api/articles/me/all",
        t.struct({"page": t.integer(), "per_page": t.integer()}),
        t.array(t.proxy(renames["ArticleIndex"])),
    )
    functions["getUserPublishedArticles"] = devto.get(
        "/api/articles/me/published",
        t.struct({"page": t.integer(), "per_page": t.integer()}),
        t.array(t.proxy(renames["ArticleIndex"])),
    )
    functions["getUserUnpublishedArticles"] = devto.get(
        "/api/articles/me/unpublished",
        t.struct({"page": t.integer(), "per_page": t.integer()}),
        t.array(t.proxy(renames["ArticleIndex"])),
    )
    functions["getArticleById"] = devto.get(
        "/api/articles/{id}",
        t.struct({"id": t.integer()}),
        t.struct({}).optional(),
    )
    functions["unpublishArticle"] = devto.put(
        "/api/articles/{id}/unpublish",
        t.struct({"id": t.integer(), "note": t.string()}),
        t.boolean().optional(),
    )
    functions["getArticleByPath"] = devto.get(
        "/api/articles/{username}/{slug}",
        t.struct({"username": t.string(), "slug": t.string()}),
        t.struct({}).optional(),
    )
    functions["getCommentsByArticleId"] = devto.get(
        "/api/comments",
        t.struct({"a_id": t.string(), "p_id": t.string()}),
        t.array(t.proxy(renames["Comment"])).optional(),
    )
    functions["getApiDisplay_ads"] = devto.get(
        "/api/display_ads",
        t.struct({}),
        t.array(t.proxy(renames["DisplayAd"])),
    )
    functions["putApiDisplay_adsIdUnpublish"] = devto.put(
        "/api/display_ads/{id}/unpublish",
        t.struct({"id": t.integer()}),
        t.boolean().optional(),
    )
    functions["getFollowers"] = devto.get(
        "/api/followers/users",
        t.struct({"page": t.integer(), "per_page": t.integer(), "sort": t.string()}),
        t.array(
            t.struct(
                {
                    "id": t.integer().optional(),
                    "name": t.string().optional(),
                    "path": t.string().optional(),
                    "profile_image": t.string().optional(),
                    "type_of": t.string().optional(),
                    "user_id": t.integer().optional(),
                }
            )
        ),
    )
    functions["getFollowedTags"] = devto.get(
        "/api/follows/tags",
        t.struct({}),
        t.array(t.proxy(renames["FollowedTag"])),
    )
    functions["getOrganization"] = devto.get(
        "/api/organizations/{username}",
        t.struct({"username": t.string()}),
        t.struct({}).optional(),
    )
    functions["getOrgArticles"] = devto.get(
        "/api/organizations/{username}/articles",
        t.struct(
            {"username": t.string(), "page": t.integer(), "per_page": t.integer()}
        ),
        t.array(t.proxy(renames["ArticleIndex"])).optional(),
    )
    functions["getOrgUsers"] = devto.get(
        "/api/organizations/{username}/users",
        t.struct(
            {"username": t.string(), "page": t.integer(), "per_page": t.integer()}
        ),
        t.array(t.proxy(renames["User"])).optional(),
    )
    functions["getApiPages"] = devto.get(
        "/api/pages",
        t.struct({}),
        t.array(t.proxy(renames["Page"])),
    )
    functions["deleteApiPagesId"] = devto.delete(
        "/api/pages/{id}",
        t.struct({"id": t.integer()}),
        t.proxy(renames["Page"]),
    )
    functions["getApiPagesId"] = devto.get(
        "/api/pages/{id}",
        t.struct({"id": t.integer()}),
        t.proxy(renames["Page"]),
    )
    functions["putApiPagesId"] = devto.put(
        "/api/pages/{id}",
        t.struct(
            {
                "id": t.integer(),
                "body_json": t.string().optional(),
                "body_markdown": t.string().optional(),
                "description": t.string(),
                "is_top_level_path": t.boolean().optional(),
                "slug": t.string(),
                "social_image": t.struct({}).optional(),
                "template": t.string(),
                "title": t.string(),
            }
        ),
        t.proxy(renames["Page"]),
        content_type="application/json",
        body_fields=(
            "body_json",
            "body_markdown",
            "description",
            "is_top_level_path",
            "slug",
            "social_image",
            "template",
            "title",
        ),
    )
    functions["getPodcastEpisodes"] = devto.get(
        "/api/podcast_episodes",
        t.struct(
            {"page": t.integer(), "per_page": t.integer(), "username": t.string()}
        ),
        t.array(t.proxy(renames["PodcastEpisodeIndex"])).optional(),
    )
    functions["getProfileImage"] = devto.get(
        "/api/profile_images/{username}",
        t.struct({"username": t.string()}),
        t.struct({}).optional(),
    )
    functions["getReadinglist"] = devto.get(
        "/api/readinglist",
        t.struct({"page": t.integer(), "per_page": t.integer()}),
        t.array(t.proxy(renames["ArticleIndex"])),
    )
    functions["getTags"] = devto.get(
        "/api/tags",
        t.struct({"page": t.integer(), "per_page": t.integer()}),
        t.array(t.proxy(renames["Tag"])),
    )
    functions["getUserMe"] = devto.get(
        "/api/users/me",
        t.struct({}),
        t.struct({}),
    )
    functions["getUser"] = devto.get(
        "/api/users/{id}",
        t.struct({"id": t.string()}),
        t.struct({}),
    )
    functions["suspendUser"] = devto.put(
        "/api/users/{id}/suspend",
        t.struct({"id": t.integer()}),
        t.boolean().optional(),
    )
    functions["unpublishUser"] = devto.put(
        "/api/users/{id}/unpublish",
        t.struct({"id": t.integer()}),
        t.boolean().optional(),
    )
    functions["videos"] = devto.get(
        "/api/videos",
        t.struct({"page": t.integer(), "per_page": t.integer()}),
        t.array(t.proxy(renames["VideoArticle"])),
    )
    # skip:end
    # ...
    return Import(
        importer="devto", renames=renames, types=Box(types), functions=Box(functions)
    )


with TypeGraph(name="devto") as g:
    devto = import_devto()

    public = policies.public()
    g.expose(getLatestArticles=devto.func("getLatestArticles").add_policy(public))
