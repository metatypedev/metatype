// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

export interface Node<T, E> {
  value: T;
  subtrees: Map<E, Node<T, E>>;
}

export class Tree<T, E> {
  root: Node<T, E>;

  constructor(rootValue: T) {
    this.root = {
      value: rootValue,
      subtrees: new Map(),
    };
  }

  static fromRootNode<T, E>(rootNode: Node<T, E>): Tree<T, E> {
    const tree = new Tree<T, E>(rootNode.value);
    tree.root = rootNode;
    return tree;
  }

  append(path: E[], value: T): Node<T, E> {
    return Tree.append(this.root, path, value);
  }

  static append<T, E>(start: Node<T, E>, path: E[], value: T): Node<T, E> {
    if (path.length === 0) {
      throw new Error("path parameter cannot be empty");
    }

    const done = [];
    const p = [...path];
    let parent: Node<T, E> = start;
    while (p.length > 1) {
      const edge = p.shift()!;
      const node = parent.subtrees.get(edge);
      if (node == null) {
        throw new Error(
          `Not found '${path.join(".")}': at '${done.join(".")}'`,
        );
      }
      parent = node;
      done.push(edge);
    }

    if (parent.subtrees.get(p[0]) != null) {
      throw new Error("Subtree already exists");
    }
    const node = Tree.createNode<T, E>(value);
    parent.subtrees.set(p[0], node);

    return node;
  }

  private static createNode<T, E>(value: T): Node<T, E> {
    return {
      value,
      subtrees: new Map(),
    };
  }

  getNode(path: E[]): Node<T, E> {
    let node = this.root;
    const p = [...path];
    while (p.length > 0) {
      const edge = p.shift()!;
      const n = node.subtrees.get(edge);
      if (n == null) {
        throw new Error("Not found");
      }
      node = n;
    }
    return node;
  }

  *getSubtreeValues(path: E[]): IterableIterator<T> {
    const root = this.getNode(path);

    function* gen(node: Node<T, E>): IterableIterator<T> {
      yield node.value;
      for (const n of node.subtrees.values()) {
        yield* gen(n);
      }
    }

    yield* gen(root);
  }

  *getSubtreeNodes(path: E[]): IterableIterator<Node<T, E>> {
    const root = this.getNode(path);

    function* gen(node: Node<T, E>): IterableIterator<Node<T, E>> {
      yield node;
      for (const n of node.subtrees.values()) {
        yield* gen(n);
      }
    }

    yield* gen(root);
  }

  *entries(): IterableIterator<[E[], T]> {
    function* gen(node: Node<T, E>, path: E[]): IterableIterator<[E[], T]> {
      yield [path, node.value];
      for (const [e, n] of node.subtrees.entries()) {
        yield* gen(n, [...path, e]);
      }
    }

    yield* gen(this.root, []);
  }

  map<U>(fn: (v: T) => U): Tree<U, E> {
    function map(node: Node<T, E>): Node<U, E> {
      const res = Tree.createNode<U, E>(fn(node.value));
      for (const [e, n] of node.subtrees.entries()) {
        res.subtrees.set(e, map(n));
      }
      return res;
    }

    return Tree.fromRootNode(map(this.root));
  }
}
