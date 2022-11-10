# Copyright Metatype under the Elastic License 2.0.

from typing import Dict


def drop_nones(d: Dict, **kwargs) -> Dict:
    return {k: v for k, v in (d | kwargs).items() if v is not None}


def pick(d: Dict, *largs):
    return {k: d.get(k) for k in largs}
