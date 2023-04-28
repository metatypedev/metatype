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
            """
            # Motativation:
            - Throw an explicit error if the user uses a reserved attr name

            all := {'b', 'pb', 'c', 'some_field', 'd', 'props', 'a'} (= set(dir(child) without __))
            parent := {'b', 'pb', 'some_field', 'props', 'a'} (= set(dir(parent) without __))
            Pb: find f, such that f(all, parent) := {a, b, c, d}
            f(all, parent) := {a, b} U (all - parent)
            But how do we compute {a, b} ?
            Motivation: since card {a, b} > 0, we can throw "a, b are reserved"

            Another way to look at it (Venn diagram as string)
            * Child  = AAAXYBBB (known)
            * Parent = AAAX (known)
            * ChildOnly = Child - Parent = BBB
            * ParentOnly = AAAXYBBB - BBB = AAAXY
            Then Child = ??? = YBBB
            Pb: Using Child and Parent, find f, f(Child, Parent) = YBBB

            * if we can exploit an info that allow us to tell X apart from Y then
            we can filter X then proceed to compute:
            (Child - X) - (Parent - X) = (AAAXYBBB - X) - (AAAX - X) = YBBB
            => ParentOnly U YBBB = AAAXY U YBBB = AAAXYBBB = Child (=all attr)
            Which proves that X is the set of the reserved names used by the user
            """
            # child U parent
            all_attr = set([i for i in dir(self) if not i.startswith("__")])
            (base,) = self.__class__.__bases__
            # parent
            parent_attr = set([i for i in dir(base) if not i.startswith("__")])
            print(all_attr)
            print(parent_attr)
            # wrong => it is possible for the child class to share the same attr
            # with the parent => throw an reserved field Error
            child_attr = all_attr - parent_attr
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
