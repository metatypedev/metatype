# Copyright Metatype under the Elastic License 2.0.

import logging
from logging.handlers import SocketHandler
import os


class Handler(SocketHandler):
    def makePickle(self, record):
        message = f"[{record.levelname}:{record.name}] {record.msg}\n"
        return message.encode()


logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

if os.environ.get("LOG_PORT"):
    port = int(os.environ.get("LOG_PORT"))
    logger.addHandler(Handler("localhost", port))
