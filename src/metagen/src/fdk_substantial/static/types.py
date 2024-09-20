from dataclasses import dataclass
from typing import Union


@dataclass
class RetryStrategy:
    max_retries: int
    initial_backoff_interval: Union[int, None]
    max_backoff_interval: Union[int, None]
