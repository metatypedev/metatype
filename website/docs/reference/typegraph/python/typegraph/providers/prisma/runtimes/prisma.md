---
sidebar_label: prisma
title: typegraph.providers.prisma.runtimes.prisma
---

## PrismaRuntime Objects

```python
@frozen
class PrismaRuntime(Runtime)
```

[Documentation](https://metatype.dev/docs/reference/runtimes/prisma)

**Attributes**:

- `name` - Name of prisma runtime
- `connection_string_secret` - Name of the secret that contains the connection string
  that will be used to connect to the database

#### link

```python
def link(typ: Union[t.TypeNode, str],
         name: Optional[str] = None,
         *,
         field: Optional[str] = None,
         fkey: Optional[bool] = None) -> t.TypeNode
```

**Arguments**:

- `name` - name of the relationship
- `field` - name of the target field on the target model
