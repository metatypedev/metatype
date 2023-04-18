from typegraph import TypeGraph, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

# import debugpy

# debugpy.listen(5678)
# debugpy.wait_for_client()

with TypeGraph(name="blog") as g:
    db = PrismaRuntime("blog", "POSTGRES")

    users = t.struct(
        {
            "id": t.integer().config("id"),
            "name": t.string(),
            "posts": t.array(g("Post")),
            "profile": g("Profile").optional(),
        }
    ).named("User")

    profiles = t.struct(
        {
            "id": t.integer().config("id"),
            "profilePic": t.string(),
            "user": g("User"),
        }
    ).named("Profile")

    posts = t.struct(
        {
            "id": t.integer().config("id"),
            "content": t.string(),
            "author": g("User"),
        }
    ).named("Post")

    public = policies.public()

    g.expose(
        createUser=db.create(users).add_policy(public),
        findUniqueUser=db.find(users).add_policy(public),
        findManyUsers=db.find_many(users).add_policy(public),
        updateUser=db.update(users).add_policy(public),
        deleteUser=db.delete(users).add_policy(public),
        createPost=db.create(posts).add_policy(public),
        findUniquePost=db.find(posts).add_policy(public),
        findManyPosts=db.find_many(posts).add_policy(public),
    )
