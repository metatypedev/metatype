# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from typing import Union


@dataclass
class RetryStrategy:
    max_retries: int
    initial_backoff_interval: Union[int, None]
    max_backoff_interval: Union[int, None]
