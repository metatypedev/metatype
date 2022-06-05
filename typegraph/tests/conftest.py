import argparse
import inspect

import black
import pytest
from redbaron import RedBaron


def pytest_addoption(parser):
    parser.addoption("--override", default=False, action=argparse.BooleanOptionalAction)


class OverrideWrapper:
    ids = {}

    def __init__(self, inner, override, test_name) -> None:
        self.inner = inner
        self.override = override
        self.test_name = test_name
        OverrideWrapper.ids[test_name] = OverrideWrapper.ids.get(test_name, -1) + 1

    @property
    def id(self) -> int:
        return OverrideWrapper.ids[self.test_name]

    def apply_override(self, file, new_value) -> None:
        with open(file, "r") as f:
            code = RedBaron(f.read())

        test = code.find("def", name=self.test_name).value
        override_tag = test.find_all(
            "atomtrailers", lambda n: n.value[0].value == "overridable"
        )[self.id]
        override = override_tag.find("call_argument")
        override.value = f"{new_value}"

        new_code = black.format_str(code.dumps(), mode=black.FileMode())

        with open(file, "w") as f:
            f.write(new_code)

    def __eq__(self, other) -> bool:
        if self.override:
            file = inspect.stack()[1].filename
            self.apply_override(file, other)
            return True

        return self.inner == other

    def __repr__(self) -> str:
        return self.inner.__repr__()


@pytest.fixture()
def overridable(pytestconfig, request):
    override = pytestconfig.getoption("override")
    test_name = request.node.name
    return lambda x: OverrideWrapper(x, override, test_name)
