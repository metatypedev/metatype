from typegraph.effects import CREATE, UPDATE
from typegraph.providers import PrismaRuntime
from typegraph.runtimes import DenoRuntime

from typegraph import Graph, t, typegraph


@typegraph()
def simple_model(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "name": t.string(),
        },
        name="User",
    )

    g.expose(
        createUser=db.create(user),
    )


@typegraph()
def schema_generation(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "name": t.string(),
        },
        name="User",
    )

    g.expose(
        createUser=db.create(user),
    )


@typegraph()
def one_to_many(g: Graph):
    db = PrismaRuntime("test_one_to_many", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer(as_id=True),
            "posts": db.link(t.list(g.ref("Post")), "postAuthor"),
        },
        name="User",
    )

    post = t.struct(
        {
            "id": t.integer(as_id=True),
            "author": db.link("User", "postAuthor"),
        },
        name="Post",
    )

    g.expose(
        createUser=db.create(user),
        createPost=db.create(post),
    )


@typegraph()
def implicit_one_to_many(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "posts": t.list(g.ref("Post")),
        },
        name="User",
    )

    post = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "author": g.ref("User"),
        },
        name="Post",
    )

    g.expose(
        createUser=db.create(user),
        createPost=db.create(post),
    )


@typegraph()
def optional_one_to_many(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "posts": t.list(g.ref("Post")),
        },
        name="User",
    )

    post = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "author": g.ref("User").optional(),
        },
        name="Post",
    )

    g.expose(
        createUser=db.create(user),
        createPost=db.create(post),
    )


@typegraph()
def one_to_one(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer(as_id=True),
            "profile": db.link(g.ref("Profile").optional(), "userProfile"),
        },
        name="User",
    )

    profile = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "user": db.link("User", "userProfile"),
        },
        name="Profile",
    )

    g.expose(
        createUser=db.create(user),
        createProfile=db.create(profile),
    )


@typegraph()
def implicit_one_to_one(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "profile": g.ref("Profile").optional(config={"auto": True}),
        },
        name="User",
    )

    profile = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "user": g.ref("User"),
        },
        name="Profile",
    )

    g.expose(
        createUser=db.create(user),
        createProfile=db.create(profile),
    )


@typegraph()
def optional_one_to_one(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "profile": g.ref("Profile").optional(),
        },
        name="User",
    )

    profile = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "user": db.link(g.ref("User").optional(), fkey=True),
        },
        name="Profile",
    )

    g.expose(
        createUser=db.create(user),
        createProfile=db.create(profile),
    )


@typegraph()
def semi_implicit_one_to_one(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer(as_id=True),
            "profile": db.link(g.ref("Profile").optional(), "userProfile"),
        },
        name="User",
    )

    profile = t.struct(
        {"id": t.uuid(as_id=True, config={"auto": True}), "user": g.ref("User")},
        name="Profile",
    )

    g.expose(
        createUser=db.create(user),
        createProfile=db.create(profile),
    )


@typegraph()
def semi_implicit_one_to_one_2(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer(as_id=True),
            "profile": g.ref("Profile").optional(),
        },
        name="User",
    )

    profile = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "user": db.link("User", "userProfile"),
        },
        name="Profile",
    )

    g.expose(
        createUser=db.create(user),
        createProfile=db.create(profile),
    )


@typegraph()
def one_to_many_self(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    tree_node = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "children": t.list(g.ref("TreeNode")),
            "parent": g.ref("TreeNode"),
        },
        name="TreeNode",
    )

    g.expose(
        createTreeNode=db.create(tree_node),
    )


@typegraph()
def explicit_one_to_many_self(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    tree_node = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "children": db.link(t.list(g.ref("TreeNode")), field="parent"),
            "parent": db.link(g.ref("TreeNode"), field="children"),
        },
        name="TreeNode",
    )

    g.expose(
        createTreeNode=db.create(tree_node),
    )


@typegraph()
def one_to_many_self_2(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    tree_node = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "parent": g.ref("TreeNode"),
            "children": t.list(g.ref("TreeNode")),
        },
        name="TreeNode",
    )

    g.expose(
        createTreeNode=db.create(tree_node),
    )


@typegraph()
def explicit_one_to_many_self_2(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    tree_node = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "parent": db.link(g.ref("TreeNode"), field="children"),
            "children": db.link(t.list(g.ref("TreeNode")), field="parent"),
        },
        name="TreeNode",
    )

    g.expose(
        createTreeNode=db.create(tree_node),
    )


@typegraph()
def one_to_one_self(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    list_node = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "next": g.ref("ListNode").optional(config={"unique": True}),
            "prev": g.ref("ListNode").optional(),
        },
        name="ListNode",
    )

    g.expose(
        createListNode=db.create(list_node),
    )


@typegraph()
def one_to_one_self_2(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    list_node = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "prev": g.ref("ListNode").optional(),
            "next": g.ref("ListNode").optional(config={"unique": True}),
        },
        name="ListNode",
    )

    g.expose(
        createListNode=db.create(list_node),
    )


@typegraph()
def multiple_relationships(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "email": t.email(config={"unique": True}),
            "posts": db.link(t.list(g.ref("Post")), field="author"),
            "favorite_post": t.optional(g.ref("Post"), config={"unique": True}),
        },
        name="User",
    )

    post = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "title": t.string(min=10, max=256),
            "content": t.string(min=1000),
            "author": g.ref("User"),
            "favorite_of": db.link(t.list(g.ref("User")), field="favorite_post"),
        },
        name="Post",
    )

    g.expose(
        createUser=db.create(user),
        createPost=db.create(post),
    )


@typegraph()
def multiple_relationships_2(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "email": t.email(config={"unique": True}),
            "posts": db.link(t.list(g.ref("Post")), field="author"),
            "published_posts": db.link(t.list(g.ref("Post")), name="PostPublisher"),
            "favorite_post": t.optional(g.ref("Post"), config={"unique": True}),
        },
        name="User",
    )

    post = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "title": t.string(min=10, max=256),
            "content": t.string(min=1000),
            "author": g.ref("User"),
            "publisher": db.link(g.ref("User").optional(), name="PostPublisher"),
            "favorite_of": db.link(t.list(g.ref("User")), field="favorite_post"),
        },
        name="Post",
    )

    g.expose(
        createUser=db.create(user),
        createPost=db.create(post),
    )


@typegraph()
def multiple_self_relationships(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    person = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "personal_hero": db.link(
                g.ref("Person").optional(config={"unique": True}),
                field="hero_of",
                name="hero",
            ),
            "hero_of": g.ref("Person").optional(),
            "mother": g.ref("Person").optional(),
            "children": db.link(t.list(g.ref("Person")), field="mother"),
        },
        name="Person",
    )

    g.expose(
        createPerson=db.create(person),
    )


@typegraph()
def injection(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")
    deno = DenoRuntime()

    user = t.struct(
        {
            "id": t.uuid(as_id=True, config=["auto"]),
            "email": t.email(config=["unique"]),
            "date_of_birth": t.date().optional().rename("DOB"),
            "age": deno.func(
                t.struct({"dob": t.date().optional().from_parent("DOB")}),
                t.integer(min=0),
                code="() => 0",
            ),
            # TODO how to make this not updatable?
            "createAt": t.datetime().inject({CREATE: "now"}),
            "updatedAt": t.datetime().inject({UPDATE: "now"}),
        },
        name="User",
    )

    g.expose(
        createUser=db.create(user),
    )


@typegraph()
def multi_field_id(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    project = t.struct(
        {
            "ownerName": t.string(),
            "name": t.string(),
            "description": t.string().optional(),
        },
        config={"id": ["ownerName", "name"]},
    ).rename("Project")

    g.expose(
        createProject=db.create(project),
    )


@typegraph()
def foreign_id(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.uuid(as_id=True, config=["auto"]),
            "email": t.email(config=["unique"]),
            "profile": g.ref("Profile").optional(),
        },
        name="User",
    )

    _profile = t.struct(
        {
            "user": user,
            "profilePicUrl": t.uri(),
            "bio": t.string().optional(),
        },
        name="Profile",
        config={"id": ["user"]},
    )

    g.expose(
        createUser=db.create(user),
    )


@typegraph()
def multi_field_unique(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    account = t.struct(
        {
            "id": t.uuid(as_id=True, config=["auto"]),
            "projects": t.list(g.ref("Project")),
        }
    ).rename("Account")

    _project = t.struct(
        {
            "id": t.uuid(as_id=True, config=["auto"]),
            "owner": g.ref("Account"),
            "name": t.string(),
        },
        config={"unique": [["owner", "name"]]},
    ).rename("Project")

    g.expose(
        createAccount=db.create(account),
    )
