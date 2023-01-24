---
sidebar_label: http
title: typegraph.runtimes.http
---

## HTTPRuntime Objects

```python
@frozen
class HTTPRuntime(Runtime)
```

Runs HTTP requests.

**Example**:

```python
from typegraph.runtime.http import HTTPRuntime

remote = HTTPRuntime('https://dev.to/api')
remote.get(
    '/test',
    t.struct({}),
    t.array(t.struct({'a': t.integer()})),
)
```
