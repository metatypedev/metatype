---
sidebar_label: injection
title: typegraph.injection
---

## StaticInjection Objects

```python
@frozen
class StaticInjection(Injection)
```

#### value

json serialized data

## DynamicValueInjection Objects

```python
@frozen
class DynamicValueInjection(Injection)
```

#### value

generator name

## ContextInjection Objects

```python
@frozen
class ContextInjection(Injection)
```

#### value

context name

## ParentInjection Objects

```python
@frozen
class ParentInjection(Injection)
```

#### value

parent type

## SecretInjection Objects

```python
@frozen
class SecretInjection(Injection)
```

#### value

secret name

