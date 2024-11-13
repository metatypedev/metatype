from datetime import timedelta
from typing import Any, Callable, Optional
from types import RetryStrategy


class Context:
    async def save(
        self,
        f: Callable,
        *,
        timeout: Optional[timedelta] = None,
        retry_strategy: Optional[RetryStrategy] = None,
    ): ...
    def handle(self, event_name: str, cb: Callable[[Any], Any]): ...
    async def ensure(self, f: Callable[[], bool]): ...
    async def sleep(self, duration: timedelta) -> Any: ...
    async def receive(name: str): ...


def workflow():
    def wrapper(f):
        pass

    return wrapper
