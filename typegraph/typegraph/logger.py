# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import logging
from logging.handlers import SocketHandler
import os


class Handler(SocketHandler):
    def makePickle(self, record):
        levelname = record.levelname
        if levelname == "DEBUG":
            color = "\33[34m"
            pass
        elif levelname == "INFO":
            color = "\33[32m"
        else:
            color = "\33[1m"
        message = f"{color}[{record.levelname}:{record.name}] \33[0m{record.msg}\n"
        return message.encode()


logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

if os.environ.get("LOG_PORT"):
    port = int(os.environ.get("LOG_PORT"))
    logger.addHandler(Handler("localhost", port))
