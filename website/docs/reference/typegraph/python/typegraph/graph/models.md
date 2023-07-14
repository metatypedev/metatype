---
sidebar_label: models
title: typegraph.graph.models
---

## Auth Objects

```python
@define
class Auth()
```

#### oauth2

```python
@classmethod
def oauth2(cls,
           name: str,
           authorize_url: str,
           access_url: str,
           scopes: str,
           profile_url: Optional[str] = None,
           profiler: Optional[str] = None) -> "Auth"
```

[Documentation](http://localhost:3000/docs/guides/authentication#oauth2-authorization)

#### jwt

```python
@classmethod
def jwt(cls, name: str, format: str, algorithm: None) -> "Auth"
```

[Documentation](http://localhost:3000/docs/guides/authentication#jwt-authentication)

