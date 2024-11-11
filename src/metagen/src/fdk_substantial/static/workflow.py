# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from substantial import workflow, Context  # noqa
from substantial.types import RetryStrategy  # noqa


@workflow()
def workflow_name(c: Context):
    raise NotImplementedError
