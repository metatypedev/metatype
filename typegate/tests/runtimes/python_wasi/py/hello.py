from nested.dep import hello


def sayHello(x: any):
    return hello(x["name"])
