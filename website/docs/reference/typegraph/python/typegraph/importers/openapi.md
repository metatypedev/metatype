---
sidebar_label: openapi
title: typegraph.importers.openapi
---

## OpenApiImporter Objects

```python
class OpenApiImporter(Importer)
```

#### \_\_init\_\_

```python
def __init__(name: str,
             *,
             url: Optional[str] = None,
             file: Optional[str] = None,
             base_url: Optional[str] = None,
             renames: Dict[str, str] = {},
             keep_names: List[str] = [])
```

Requires either only `url` or `file` and `base_url`

## Path Objects

```python
class Path()
```

#### gen\_input\_type

```python
def gen_input_type(op_spec: Box) -> Tuple[t.typedef, Box]
```

Returns a tuple of t.typedef and a box of kwargs
