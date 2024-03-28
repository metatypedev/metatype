def even(x):
    if x == 0:
        return True
    if x == -1:
        return False
    return odd(abs(x) - 1)


def odd(x):
    return even(abs(x) - 1)
