# Copyright Metatype under the Elastic License 2.0.

from typing import Dict


def merge(*dicts: Dict):
    ret = dict()
    for d in dicts:
        ret.update(d)
    return ret


def drop_nones(d: Dict, **kwargs) -> Dict:
    return {k: v for k, v in merge(d, kwargs).items() if v is not None}


def pick(d: Dict, *largs):
    return {k: d.get(k) for k in largs}
