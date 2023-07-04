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
           profile_url: Optional[str] = None,
           profiler: Optional[str] = None) -> "Auth"
```

OAuth2 authentication

#### jwt

```python
@classmethod
def jwt(cls, name: str, format: str, algorithm: None) -> "Auth"
```

Import a JSON Web Token for authentication.

**Arguments**:

- `name` _str_ - Name of the authentication
- `format` _str_ - Format of the key. Can be "jwk", "raw", "pkcs8" or "spki".
- `algorithm` _Dict[str, str], optional_ - Arguments for the authentication. Defaults to None. See `algorithm` parameters in [SubtleCrypto.importKey()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey) for more information.
  

**Example**:

  Generate a private/public ECDSA key pair using Deno:
  deno eval '
  const keys = await crypto.subtle.generateKey({name: "ECDSA", namedCurve: "P-384"}, true, ["sign", "verify"]);
  const publicKey = await crypto.subtle.exportKey("jwk", keys.publicKey);
  // save keys.privateKey for later use
  console.log(JSON.stringify(publicKey));
  // Auth.jwt("keycloak", "jwk", {"name": "ECDSA", "namedCurve": "P-384"})
  '

#### hmac256

```python
@classmethod
def hmac256(cls, name: str) -> "Auth"
```

Import a HMAC SHA-256 for authentication.

**Arguments**:

- `name` _str_ - Name of the authentication

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

