from import_ import concat


def say_hello(obj: any):
    return concat(["Hello", " ", obj["name"], " from python module"])
