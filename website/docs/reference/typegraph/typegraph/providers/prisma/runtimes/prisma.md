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
  
  Relationship fields must be defined on both sides of the relationship.
  A relationship is always defined for `t.struct` types and `t.optional` or
  `t.array` of `t.struct`s.
  
  Relatioships can also be defined implicitly using the [`link`](#link) instance method
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
  
  The `PrismaRuntime` supports two kinds of relationship between models.
  
  #### One-to-one relationships
  
  A one-to-one relationship must be in one of these two variants.
  
  | Cardinality | Field type in Model1 | Field type in Model2 |
  |---|---|---|
  | 1..1 ↔ 0..1 | `g("Model2")` | `g("Model1").optional()` |
  | 0..1 ↔ 0..1 | `g("Model2").optional()` | `g("Model1").optional()` |
  
  For the optional (0..1 ↔ 0..1) one-to-one relationship,
  you need to indicate on which field/model the foreign key will be by:
  - wrapping the type in a [`runtime.link(.)`](#link) with `fkey=True`:
  `runtime.link(g("Model2").optional(), fkey=True)`;<br/>
  - or adding `.config("unique")`: `g("Model2").optional().config("unique")`.
  
  
  #### One-to-many relationships
  
  A one-to-many relationship must be in one of these two variants.
  
  | Cardinality | Field type in Model1 | Field type in Model2 |
  |---|---|---|
  | 1..1 ↔ 0..n | `g("Model2")` | `t.array(g("Model1"))` |
  | 0..1 ↔ 0..n | `g("Model2").optional()` | `t.array(g("Model1"))` |
  
  
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
         name: Optional[str] = None,
         *,
         field: Optional[str] = None,
         fkey: Optional[bool] = None) -> t.TypeNode
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
def queryRaw(query: str, out: t.TypeNode, *, effect: Effect) -> t.func
```

Generate a raw SQL query operation on the runtime

**Example**:

```python
db = PrismaRuntime("my-app", "POSTGRES")
g.expose(
    countUsers=db.queryRaw("SELECT COUNT(*) FROM User", t.integer())
)
```

#### executeRaw

```python
def executeRaw(query: str, *, effect: Effect) -> t.func
```

Generate a raw SQL query operation without return

**Example**:

```python
db = PrismaRuntime("my-app", "POSTGRES")
g.expose(
    setActive=db.executeRaw("UPDATE User SET active = TRUE WHERE id=$1", effect=effects.update()),
)
```
