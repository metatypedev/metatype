# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.


class Typedef:
    def __init__(self, v):
        self.v = v


class Parent:
    some_field = "Parent pa"
    pb = "Parent pb"
    a = "Parent a"

    props = {}

    def __init__(self, p={}) -> None:
        if self.__class__ == Parent:
            super().__init__(p)
        else:
            all_attr = set([i for i in dir(self) if not i.startswith("__")])
            (base,) = self.__class__.__bases__
            parent_attr = set([i for i in dir(base) if not i.startswith("__")])
            common = all_attr.intersection(parent_attr)
            child_attr = list(common.union(all_attr - parent_attr))

            # 1. if child uses a reserved name, it will not be taken into account
            # 2. there is currently no way of determining which attr is strictly
            #    owned by the Child
            # Concept:
            # Parent => knows about its attributes (parent)
            # Child => knows about all attributes (parent U attr)
            # Parent - Child = attr' but there is no guarantee that attr' == attr
            # since parent Union attr can overlap (Child can override a field from Parent)
            # => it's impossible to safely tell the user if a name is reserved
            for attr in child_attr:
                value = self.__getattribute__(attr)
                if isinstance(value, Typedef):
                    self.props[attr] = value


class Child(Parent):
    a = Typedef("Child a")  # overlaps with Parent.a
    b = Typedef("Child b")
    c = "not included"
    d = Typedef("Child d")


c = Child()
print(c.props.keys())
