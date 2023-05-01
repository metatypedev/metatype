# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import attrs
from attrs import Attribute, field

SKIP = "asdict_skip"


def always(value):
    return field(default=value, init=False)


def required():
    return field(init=True, kw_only=True)


def asdict(inst):
    # We do not use the `_value` parameter, but it is part of the signature
    # of the filter used by `attrs.asdict`
    def filter(attr: Attribute, _value):
        if attr.metadata is not None and attr.metadata.get(SKIP, False):
            return False
        return True

    return attrs.asdict(inst, filter=filter, recurse=False)
