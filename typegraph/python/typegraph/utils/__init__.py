# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import sys
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


def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)
