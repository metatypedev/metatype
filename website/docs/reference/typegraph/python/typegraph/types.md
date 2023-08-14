---
sidebar_label: types
title: typegraph.types
---

## number\_base Objects

```python
@with_constraints

@frozen
class number_base(typedef)
```

See [`t.number()`](/docs/reference/type-system#tnumber)

## integer Objects

```python
@frozen
class integer(number_base)
```

See [`t.integer()`](/docs/reference/type-system#tinteger)

## union Objects

```python
@frozen
class union(typedef)
```

A `union` type represents a general union with the variants provided.

The `union` type is equivalent to the `anyOf` field in JSON Schema where
the given data must be valid against one or more of the given subschemas.

## either Objects

```python
@frozen
class either(typedef)
```

An `either` type represents a disjoint union with the variants provided.

The `either` type is equivalent to the `oneOf` field in JSON Schema where
the given data must be valid against exactly one of the given subschemas.

