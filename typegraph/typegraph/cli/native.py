import native


def test():
    print(native.say_hello())
    print(native.migrate("test", dict(a=1))["name"])
