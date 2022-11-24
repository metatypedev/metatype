# Copyright Metatype under the Elastic License 2.0.

import attrs
from attrs import Attribute
from attrs import field


SKIP = "asdict_skip"


def always(value):
    return field(default=value, init=False)


def filter(attr: Attribute, _value):
    if attr.metadata is not None and attr.metadata.get(SKIP, False):
        return False
    return True


def asdict(inst):
    return attrs.asdict(inst, filter=filter, recurse=False)
