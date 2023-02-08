---
sidebar_label: relations
title: typegraph.providers.prisma.relations
---

#### check\_field

```python
def check_field(type: t.struct, field_name: str) -> bool
```

Check if a field represents a relationship

## Side Objects

```python
class Side(StrEnum)
```

A relationship is defined between two models:
- the "owner", on the "left" side of the relationship, has the foreign key
- the "ownee", on the "right" side of the relationship

## RelationshipRegister Objects

```python
class RelationshipRegister()
```

Relationships are defined by `LinkProxy` NodeProxy types on the model types (`t.struct`).
