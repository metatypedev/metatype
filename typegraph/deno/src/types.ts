import { core } from "../gen/typegraph_core.js";

const proxy = {
  get(target, p, receiver) {
    if (typeof p === "symbol") {
      return Reflect.get(target, p, receiver);
    }
    return target[p] ?? core.gettpe(target.id, p);
  },
};

class Tpe {
  id: number;
}

class Struct extends Tpe {
}

export function struct<T extends { [key: string]: Tpe }>(props: T): Struct & T {
  const tpe = Object.assign(new Struct(), core.structb(Object.entries(props)));
  return new Proxy<T & Struct>(tpe, proxy);
}

class Integer extends Tpe {
  _min: number;

  min(n: number) {
    const tpe = Object.assign(new Integer(), core.integermin(this.id, n));
    return new Proxy<Integer>(tpe, proxy);
  }
}

export function integer() {
  const tpe = Object.assign(new Integer(), core.integerb());
  return new Proxy<Integer>(tpe, proxy);
}
