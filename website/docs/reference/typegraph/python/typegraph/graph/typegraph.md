---
sidebar_label: typegraph
title: typegraph.graph.typegraph
---

## TypeGraph Objects

```python
class TypeGraph()
```

#### type\_by\_names

for explicit names

#### get\_absolute\_path

```python
def get_absolute_path(relative: str, stack_depth: int = 1) -> Path
```

Concat stack_depth-th immediate caller path with `relative`.
By default, `stack_depth` is set to 1, this ensure that the file
holding the definition of this function is not considered.

