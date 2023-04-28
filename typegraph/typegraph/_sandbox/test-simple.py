# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.


class Typedef:
    def __init__(self, v):
        self.v = v


class Parent:
    some_field = "Parent pa"
    pb = "Parent pb"
    a = "Parent a"
    b = "Parent b"

    props = {}

    def __init__(self, p={}) -> None:
        if self.__class__ == Parent:
            super().__init__(p)
        else:
            (base,) = self.__class__.__bases__
            child_cls = self.__class__
            child_attr = set([i for i in vars(child_cls) if not i.startswith("__")])
            parent_attr = set([i for i in vars(base) if not i.startswith("__")])
            common = sorted(parent_attr.intersection(child_attr))
            if len(common) > 0:
                err_msg = ", ".join(common)
                if len(common) == 1:
                    err_msg += " is reserved"
                else:
                    err_msg += " are reserved"
                raise Exception(err_msg)
            self_attr = sorted(child_attr - parent_attr)
            for attr in self_attr:
                value = getattr(self, attr)
                if isinstance(value, Typedef):
                    self.props[attr] = value


class Child(Parent):
    # a = Typedef("Child a")  # overlaps with Parent.a
    # b = Typedef("Child b")  # overlaps with Parent.b
    c = "not included"
    d = Typedef("Child d")
    e = Typedef("Child e")


c = Child()
print({k: v.v for k, v in c.props.items()})
