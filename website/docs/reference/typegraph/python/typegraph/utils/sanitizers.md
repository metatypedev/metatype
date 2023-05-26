---
sidebar_label: sanitizers
title: typegraph.utils.sanitizers
---

#### inject\_params

```python
def inject_params(s: str, params: Union[None, Dict[str, str]])
```

**Example**:

  
  s = `"{protocol}://{hostname}"`, params= `{'protocol': 'http', 'hostname': 'example.com'}`
  
  returns `"http://example.com"`

#### as\_attr

```python
def as_attr(name: str)
```

Convert a string into valid attribute

**Example**:

  
  `root:some complicated/Name` => `root_some_complicated_Name`
