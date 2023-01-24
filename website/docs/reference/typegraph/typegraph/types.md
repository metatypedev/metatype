---
sidebar_label: types
title: typegraph.types
---

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
