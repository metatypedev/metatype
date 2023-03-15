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

#### jwk

```python
@classmethod
def jwk(cls, name: str, args=None) -> "Auth"
```

Import a JSON Web Key (JWK) for authentication.

**Arguments**:

- `name` _str_ - Name of the authentication
- `args` _Dict[str, str], optional_ - Arguments for the authentication. Defaults to None. See `algorithm` parameters in [SubtleCrypto.importKey()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey) for more information.

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
