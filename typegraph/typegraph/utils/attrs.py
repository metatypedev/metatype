# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Optional

import attrs
from attrs import Attribute, field

SKIP = "asdict_skip"


def always(value):
    return field(kw_only=True, default=value, init=False)


def optional_field():
    return field(kw_only=True, default=None)


def required():
    return field(kw_only=True, init=True)


TYPE_CONSTRAINT = "__type_constraint_name"


def constraint(name: Optional[str] = None):
    # Additional constraint on type: Validation keyword.
    # Field to be manually set on the serialization.
    return field(
        kw_only=True,
        init=True,
        default=None,
        metadata={SKIP: True, TYPE_CONSTRAINT: name or True},
    )


def asdict(inst):
    # We do not use the `_value` parameter, but it is part of the signature
    # of the filter used by `attrs.asdict`
    def filter(attr: Attribute, _value):
        if attr.metadata is not None and attr.metadata.get(SKIP, False):
            return False
        return True

    return attrs.asdict(inst, filter=filter, recurse=False)
