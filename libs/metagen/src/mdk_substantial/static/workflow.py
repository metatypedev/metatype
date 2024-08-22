from substantial import workflow, Context  # noqa
from substantial.types import RetryStrategy  # noqa


@workflow()
def workflow_name(c: Context):
    raise NotImplementedError
