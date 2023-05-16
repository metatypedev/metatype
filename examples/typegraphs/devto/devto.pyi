from typegraph import t

class TypeList:
    Article: t.typedef = ...
    ArticleFlareTag: t.typedef = ...
    ArticleIndex: t.typedef = ...
    Comment: t.typedef = ...
    DisplayAd: t.typedef = ...
    FollowedTag: t.typedef = ...
    Organization: t.typedef = ...
    Page: t.typedef = ...
    PodcastEpisodeIndex: t.typedef = ...
    ProfileImage: t.typedef = ...
    SharedOrganization: t.typedef = ...
    SharedPodcast: t.typedef = ...
    SharedUser: t.typedef = ...
    Tag: t.typedef = ...
    User: t.typedef = ...
    UserInviteParam: t.typedef = ...
    VideoArticle: t.typedef = ...

class FuncList:
    postAdminUsersCreate: t.func = ...
    getArticles: t.func = ...
    getLatestArticles: t.func = ...
    getUserArticles: t.func = ...
    getUserAllArticles: t.func = ...
    getUserPublishedArticles: t.func = ...
    getUserUnpublishedArticles: t.func = ...
    getArticleById: t.func = ...
    unpublishArticle: t.func = ...
    getArticleByPath: t.func = ...
    getCommentsByArticleId: t.func = ...
    getApiDisplay_ads: t.func = ...
    putApiDisplay_adsIdUnpublish: t.func = ...
    getFollowers: t.func = ...
    getFollowedTags: t.func = ...
    getOrganization: t.func = ...
    getOrgArticles: t.func = ...
    getOrgUsers: t.func = ...
    getApiPages: t.func = ...
    deleteApiPagesId: t.func = ...
    getApiPagesId: t.func = ...
    putApiPagesId: t.func = ...
    getPodcastEpisodes: t.func = ...
    getProfileImage: t.func = ...
    getReadinglist: t.func = ...
    getTags: t.func = ...
    getUserMe: t.func = ...
    getUser: t.func = ...
    suspendUser: t.func = ...
    unpublishUser: t.func = ...
    videos: t.func = ...

class Import:
    types: TypeList = ...
    functions: FuncList = ...

def import_devto() -> Import: ...
