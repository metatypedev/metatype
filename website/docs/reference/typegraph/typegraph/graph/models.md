---
sidebar_label: models
title: typegraph.graph.models
---

## Auth Objects

```python
@define
class Auth()
```

Authentication options

#### oauth2

```python
@classmethod
def oauth2(cls,
           name: str,
           authorize_url: str,
           access_url: str,
           scopes: str,
           profile_url: Optional[str] = None) -> "Auth"
```

OAuth2 authentication

## Cors Objects

```python
@define
class Cors()
```

CORS options

## Rate Objects

```python
@define
class Rate()
```

Rate limiting options
