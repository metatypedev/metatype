---
sidebar_label: importer
title: typegraph.importers.base.importer
---

## Importer Objects

```python
class Importer()
```

Base importer class

#### headers

codegen header lines

#### \_\_init\_\_

```python
def __init__(name: str,
             *,
             renames: Dict[str, str] = {},
             keep_names: List[str] = [])
```

**Arguments**:

- ``name`` - name of the importer
- ``renames`` - a dictionary mapping original (imported) names to exposed names
- ``keep_names`` - a list of names to keep as the original (imported)
