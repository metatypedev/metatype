---
sidebar_label: relations
title: typegraph.providers.prisma.relations
---

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
