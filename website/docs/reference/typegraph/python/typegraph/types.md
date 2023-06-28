---
sidebar_label: types
title: typegraph.types
---

## typedef Objects

```python
@frozen
class typedef(Node)
```

Base class for all the types

## number Objects

```python
@with_constraints

@frozen
class number(typedef)
```

Represents a generic number.

**Arguments**:

- `_min` _float, optional_ - minimum constraint
- `_max` _float, optional_ - maximum constraint
- `_x_min` _float, optional_ - exclusive minimum constraint
- `_x_max` _float, optional_ - exclusive maximum constraint
- `_multiple_of` _float, optional_ - number must be a multiple of

## integer Objects

```python
@frozen
class integer(number)
```

An integer.

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

