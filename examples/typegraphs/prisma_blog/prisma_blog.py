from typegraph import TypeGraph, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

# import debugpy

# debugpy.listen(5678)
# debugpy.wait_for_client()

with TypeGraph(name="blog") as g:
    db = PrismaRuntime("blog", "POSTGRES")

    postAuthor = db.one_to_many(g("User"), g("Post")).named("postAuthor")

    userProfile = db.one_to_one(g("User"), g("Profile")).named("userProfile")

    users = t.struct(
        {
            "id": t.integer().config("id"),
            "name": t.string(),
            "posts": postAuthor.owned(),
            "profile": userProfile.owned(),
        }
    ).named("User")

    profiles = t.struct(
        {
            "id": t.integer().config("id"),
            "profilePic": t.string(),
            "user": userProfile.owner(),
        }
    ).named("Profile")

    posts = t.struct(
        {
            "id": t.integer().config("id"),
            "content": t.string(),
            "author": postAuthor.owner(),
        }
    ).named("Post")

    db.manage(users)
    db.manage(posts)
    db.manage(profiles)

    public = policies.public()

    g.expose(
        **db.gen(
            {
                "createUser": (users, "create", public),
                "findUniqueUser": (users, "findUnique", public),
                "findManyUsers": (users, "findMany", public),
                "updateUser": (users, "update", public),
                "deleteUser": (users, "delete", public),
                "createPost": (posts, "create", public),
                "findUniquePost": (posts, "findUnique", public),
                "findManyPosts": (posts, "findMany", public),
            }
        )
    )
