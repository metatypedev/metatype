# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.


class Singleton(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]
