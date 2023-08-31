# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from typing import Dict, Union


def serialize_record_values(obj: Union[Dict[str, any], None]):
    return [(k, json.dumps(v)) for k, v in obj.items()] if obj is not None else None
