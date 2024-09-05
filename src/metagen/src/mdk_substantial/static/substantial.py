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
    ):
        pass

    def handle(self, event_name: str, cb: Callable[[Any], Any]):
        pass

    async def ensure(self, f: Callable[[], bool]):
        pass

    async def sleep(self, duration: timedelta) -> Any:
        pass

    async def receive(name: str):
        pass


def workflow():
    def wrapper(f):
        pass

    return wrapper
