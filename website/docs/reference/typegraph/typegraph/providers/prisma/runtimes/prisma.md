---
sidebar_label: prisma
title: typegraph.providers.prisma.runtimes.prisma
---

## PrismaRuntime Objects

```python
@frozen
class PrismaRuntime(Runtime)
```

> A database ORM runtime.

**Attributes**:

- ``name`` - Name of prisma runtime
- ``connection_string_secret`` - Name of the secret that contains the connection string
  that will be used to connect to the database
  

**Example**:

```python
with TypeGraph("prisma-runtime-example") as g:
    db = PrismaRuntime("main_db", "DB_CONNECTION")

    user = t.struct(
        {
            "id": t.uuid().config("id", "auto"),
            "email": t.email(),
        }
    )

    g.expose(
        createUser=db.create(user).add_policy(public)
    )
```
  
  ### Models
  
  Any `t.struct` that is passed to a generator of a `PrismaRuntime`
  defines a model.
  Models must have an ID field specified by the `"id"` config.
  
  Here is the list of all the available configs for model fields:
  
  | Config | Effect |
  |---|---|
  | `id` | defines the field ID for the model (a.k.a. primary key) |
  | `auto` | the value of this field can be auto generated; supported for `t.integer()` (auto-increment) and `t.uuid()` |
  | `unique` | make this field unique among all instances of the model |
  
  ### Relationships
  
  The `PrismaRuntime` supports two kinds of relationship between models.
  
  | Relationship | Field type in Model1 | Field type in Model2 |
  |---|---|---|
  |One to one| `g("Model2")` | `g("Model1").optional()` |
  |One to many| `g("Model2")` | `t.array(g("Model1"))` |
  
  Relationship fields must be defined on both sides of the relationship.
  A relationship is always defined for `t.struct` types and `t.optional` or
  `t.array` of `t.struct`s.
  
  Relatioships can also be defined implicitly using the `link` instance method
  of `PrismaRuntime`.
  

**Example**:

  
```python
runtime = PrismaRuntime("example", "POSTGRES")

user = t.struct(
    {
        "id": t.uuid().config("id", "auto"),
        "email": t.email().config("unique"),
        "posts": t.array(g("Post")),
    }
).named("User")

post = t.struct(
    {
        "id": t.uuid().config("id", "auto"),
        "title": t.string(),
        "author": g("User"),
    }
).named("Post")
```
  
  ### Generators
  
  Generators are instance methods of `PrismaRuntime` that can be used
  to generate a `t.func` that represents a specific operation on a specific
  model of the runtime.
  They match to the model queries defined for the
  [prisma client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference).
  for the type of the input `t.struct` and the return type.
  

**Example**:

  
```python
with TypeGraph("prisma-runtime-example") as g:
    db = PrismaRuntime("main_db", "DB_CONNECTION")

    user = t.struct(
        {
            "id": t.uuid().config("id", "auto"),
            "email": t.email(),
        }
    )

    g.expose(
        createUser=db.create(user).add_policy(public),
        findUser=db.find_unique(user).add_policy(public),
        findManyUsers=db.find_many(user).add_policy(public),
    )
```
  
  Here is a list of all available generators:
  - `find_unique`
  - `find_many`
  - `create`
  - `update`
  - `delete`
  - `delete_many`

#### link

```python
def link(typ: Union[t.TypeNode, str],
         name: str,
         field: Optional[str] = None) -> t.TypeNode
```

Explicitly declare a relationship between models. The return value of
this function shall be the type of a property of a `t.struct` that
defines a model.
If the other end of the relationship is also defined using `link`,
both links must have the same name.

**Arguments**:

- `name` - name of the relationship
- `field` - name of the target field on the target model
  

**Example**:

```python
runtime = PrismaRuntime("example", "POSTGRES")

user = t.struct(
    {
        "id": t.uuid().config("id", "auto"),
        "email": t.email().config("unique"),
        "posts": runtime.link(t.array(g("Post")), "postAuthor"),
    }
).named("User")

post = t.struct(
    {
        "id": t.uuid().config("id", "auto"),
        "title": t.string(),
        "author": runtime.link(g("User"), "postAuthor"),
    }
).named("Post")
```

#### queryRaw

```python
def queryRaw(query: str, *, effect: Effect) -> t.func
```

Generate a raw SQL query operation

#### executeRaw

```python
def executeRaw(query: str, *, effect: Effect) -> t.func
```

Generate a raw SQL query operation without return
