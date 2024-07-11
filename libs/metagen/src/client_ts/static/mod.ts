export type GraphQlTransportOptions = Omit<RequestInit, "body"> & {
  fetch?: typeof fetch;
};

// we can probably hoist this to a common impl
export class GraphQLTransport {
  constructor(
    public address: URL,
    public options: GraphQlTransportOptions,
    private typeToGqlTypeMap: Record<string, string>,
  ) {}

  #buildGql(
    query: Record<string, SelectNode>,
    ty: "query" | "mutation",
    name: string = "",
  ) {
    const variables = new Map<string, NodeArgValue>();
    const rootNodes = Object
      .entries(query)
      .map(([key, node]) => `${key}: ${convertQueryNodeGql(node, variables)}`)
      .join("\n  ");
    const doc = `${ty} ${name}(${
      [...variables.entries()].map(([key, val]) =>
        `${key}: ${this.typeToGqlTypeMap[val.typeName]}`
      )
        .join(", ")
    }) {
  ${rootNodes}
}`;
    return { doc, variables: Object.fromEntries(variables.entries()) };
  }

  async #fetch(
    doc: string,
    variables: Record<string, unknown>,
    options?: GraphQlTransportOptions,
  ) {
    const fetchImpl = options?.fetch ?? this.options.fetch ?? fetch;
    const res = await fetchImpl(this.address, {
      ...this.options,
      ...options,
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...this.options.headers ?? {},
        ...options?.headers ?? {},
      },
      body: JSON.stringify({
        query: doc,
        variables,
      }),
    });
    if (!res.ok) {
      throw new Error(
        `graphql request to ${this.address} failed: ${await res.text()}`,
        {
          cause: {
            response: res,
          },
        },
      );
    }
    return await res.json() as { data: unknown,  errors?: object[] };
  }

  async query<Doc extends Record<string, QueryNode<unknown>>>(
    query: Doc,
    options?: GraphQlTransportOptions,
  ): Promise<
    {
      [K in keyof Doc]: SelectNodeOut<Doc[K]>;
    }
  > {
    const { variables, doc } = this.#buildGql(
      Object.fromEntries(
        Object.entries(query).map((
          [key, val],
        ) => [key, (val as QueryNode<unknown>).inner]),
      ),
      "query",
    );
    const res = await this.#fetch(doc, variables, options);
    if ("errors" in res) {
      throw new Error("graphql errors on response", {
        cause: res.errors,
      });
    } 
    return res.data as {
      [K in keyof Doc]: SelectNodeOut<Doc[K]>;
    };
  }

  async mutation<Doc extends Record<string, QueryNode<unknown>>>(
    query: Doc,
    options?: GraphQlTransportOptions,
  ): Promise<
    {
      [K in keyof Doc]: SelectNodeOut<Doc[K]>;
    }
  > {
    const { variables, doc } = this.#buildGql(
      Object.fromEntries(
        Object.entries(query).map((
          [key, val],
        ) => [key, (val as MutationNode<unknown>).inner]),
      ),
      "query",
    );
    const res = await this.#fetch(doc, variables, options);
    if ("errors" in res) {
      throw new Error("graphql errors on response", {
        cause: res.errors,
      });
    } 
    return res.data as {
      [K in keyof Doc]: SelectNodeOut<Doc[K]>;
    };
  }

  prepareQuery<
    T,
    Q extends Record<string, QueryNode<unknown>>,
  >(
    fun: (args: T) => Q,
  ): PreparedRequest<T, { [K in keyof Q]: SelectNode<SelectNodeOut<Q[K]>> }> {
    return new PreparedRequest((args: T) => {
      const doc = fun(args);
      return Object.fromEntries(
        Object
          .entries(doc)
          .map(([key, val]) => [key, (val as QueryNode<unknown>).inner]),
      );
    });
  }

  prepareMutation<
    T,
    Q extends Record<string, MutationNode<unknown>>,
  >(
    fun: (args: T) => Q,
  ): PreparedRequest<T, { [K in keyof Q]: SelectNode<SelectNodeOut<Q[K]>> }> {
    return new PreparedRequest((args: T) => {
      const doc = fun(args);
      return Object.fromEntries(
        Object
          .entries(doc)
          .map(([key, val]) => [key, (val as MutationNode<unknown>).inner]),
      );
    });
  }
}

class PreparedRequest<
  T,
  Q extends Record<string, SelectNode<unknown>>,
> {
  constructor(private _fun: (args: T) => Record<string, SelectNode>) {}

  do(_args: T): Promise<
    {
      [K in keyof Q]: SelectNodeOut<Q[K]>;
    }
  > {
    throw new Error("not yet implemented");
  }
}

type NodeArgValue = {
  typeName: string;
  value: unknown;
};

type NodeArgs = {
  [name: string]: NodeArgValue;
};

type SelectionFlags = "selectAll";

type Selection = {
  _?: SelectionFlags;
  [key: string]:
    | undefined
    | boolean
    | Selection
    | SelectionFlags
    | [Record<string, unknown>, Selection | undefined];
};

type NodeMeta = {
  subNodes?: [string, NodeMeta][];
  argumentTypes?: { [name: string]: string };
};

export type DeArrayify<T> = T extends Array<infer Inner> ? Inner : T;

type SelectNode<Out = unknown> = {
  _phantom?: Out;
  name: string;
  args?: NodeArgs;
  subNodes?: SelectNode[];
};

export class QueryNode<Out> {
  constructor(
    public inner: SelectNode<Out>,
  ) {}
}

export class MutationNode<Out> {
  constructor(
    public inner: SelectNode<Out>,
  ) {}
}

type SelectNodeOut<T> = T extends QueryNode<infer O> ? O : never;

function selectionToNodeSet(
  selection: Selection,
  metas: [string, NodeMeta][],
  parentPath: string,
): SelectNode<unknown>[] {
  const out = [] as SelectNode[];
  const selectAll = selection._ == "selectAll";
  // set of the user specified nodes to do sanity
  // check at the end
  const foundNodes = new Set(Object.keys(selection));

  for (
    const [nodeName, { subNodes, argumentTypes }] of metas ?? []
  ) {
    foundNodes.delete(nodeName);

    const nodeSelection = selection[nodeName];
    if (!nodeSelection && !selectAll) {
      // this node was not selected
      continue;
    }

    const node: SelectNode = { name: nodeName };

    if (argumentTypes) {
      if (!Array.isArray(nodeSelection)) {
        throw new Error(
          `node at ${parentPath}.${nodeName} ` +
            `requires arguments but selection ` +
            `is typeof ${typeof nodeSelection}`,
        );
      }
      const [arg] = nodeSelection;
      // TODO: consider bringing in Zod (after hoisting impl into common lib)
      if (typeof arg != "object") {
        throw new Error(
          `node at ${parentPath}.${nodeName} ` +
            `requires argument object but first element of ` +
            `selection is typeof ${typeof arg}`,
        );
      }
      const expectedArguments = new Map(Object.entries(argumentTypes));
      // TODO: consider logging a warning if `_` is detected incase user passes
      // Selection as arg
      node.args = Object.fromEntries(
        Object.entries(arg).map(([key, value]) => {
          const typeName = expectedArguments.get(key);
          if (!typeName) {
            throw new Error(
              `unexpected argument ${key} at ${parentPath}.${nodeName}`,
            );
          }
          expectedArguments.delete(key);
          return [key, { typeName, value }];
        }),
      );
      // TODO: consider detecting required arguments here
    }

    if (subNodes) {
      let subSelections = nodeSelection;
      if (argumentTypes) {
        if (!Array.isArray(subSelections)) {
          throw new Error(
            `node at ${parentPath}.${nodeName} ` +
              `is a composite that takes an argument but selection is typeof ${typeof nodeSelection}`,
          );
        }
        subSelections = subSelections[1];
      } else if (Array.isArray(subSelections)) {
        throw new Error(
          `node at ${parentPath}.${nodeName} ` +
            `is a composite that takes no arguments but selection is typeof ${typeof nodeSelection}`,
        );
      }
      if (typeof subSelections != "object") {
        throw new Error(
          `node at ${parentPath}.${nodeName} ` +
            `is a no argument composite but first element of ` +
            `selection is typeof ${typeof nodeSelection}`,
        );
      }
      node.subNodes = selectionToNodeSet(
        subSelections,
        subNodes,
        `${parentPath}.${nodeName}`,
      );
    }

    out.push(node);
  }
  foundNodes.delete("_");
  if (foundNodes.size > 0) {
    throw new Error(
      `unexpected nodes found in selection set at ${parentPath}: ${[
        ...foundNodes,
      ]}`,
    );
  }
  return out;
}

function convertQueryNodeGql(
  node: SelectNode,
  variables: Map<string, NodeArgValue>,
) {
  let out = node.name;

  const args = node.args;
  if (args) {
    out = `${out} (${
      Object.entries(args)
        .map(([key, val]) => {
          const name = `$in${variables.size}`;
          variables.set(name, val);
          return `${key}: ${name}`;
        })
    })`;
  }

  const subNodes = node.subNodes;
  if (subNodes) {
    out = `${out} { ${
      subNodes.map((node) => convertQueryNodeGql(node, variables)).join(" ")
    } }`;
  }
  return out;
}

class QueryGraphBase {
  constructor(private typeNameMapGql: Record<string, string>) {}

  graphql(addr: URL | string, options?: GraphQlTransportOptions) {
    return new GraphQLTransport(
      new URL(addr),
      options ?? {},
      this.typeNameMapGql,
    );
  }
}

// -------------------------------------------------- //

/* const nodeMetas = {
  scalar() {
    return {};
  },

  User(): NodeMeta {
    return {
      subNodes: [
        ["id", this.scalar()],
        ["email", this.scalar()],
        ["posts", this.getPosts()],
      ],
    };
  },

  getUser(): NodeMeta {
    return {
      ...this.User(),
      argumentTypes: {
        id: "String!",
      },
    };
  },

  Post(): NodeMeta {
    return {
      subNodes: [
        ["slug", this.scalar()],
        ["title", this.scalar()],
      ],
    };
  },

  getPosts(): NodeMeta {
    return {
      ...this.Post(),
      argumentTypes: {
        filter: "String",
      },
    };
  },
};

// the query graph implementation will
// depend on the typegraph
export class QueryGraph extends QueryGraphBase {
  constructor() {
    super({
      "UserArgs": "UserArgs!",
      "PostArgs": "PostArgs!",
    });
  }
  getUser(args: UserArgs, select: UserSelectParams) {
    const inner = selectionToNodeSet(
      { "getUser": [args, select] },
      [["getUser", nodeMetas.getUser()]],
      "$q",
    );
    return new QueryNode(inner[0]) as QueryNode<User>;
  }

  getPosts(args: PostArgs, select: PostSelectParams) {
    const inner = selectionToNodeSet(
      { "getPosts": [args, select] },
      [
        ["getPosts", nodeMetas.getPosts()],
      ],
      "$q",
    );
    return new QueryNode(inner[0]) as QueryNode<Post[]>;
  }
}

// these would be typegrpah specific types
type User = { id: string; email: string; posts: Post[] };
type UserArgs = { id: string };
type UserSelectParams = {
  _?: SelectionFlags;
  id?: boolean;
  email?: boolean;
  posts?: [PostArgs, PostSelectParams] | false;
};

type Post = { slug: string; title: string };
type PostArgs = { filter?: string };
type PostSelectParams = {
  _?: SelectionFlags;
  slug?: boolean;
  title?: boolean;
}; */

const api1 = new QueryGraph();

const gqlClient = api1.graphql("http://localhost:7890");

const { user, posts } = await gqlClient.query({
  // syntax very similar to typegraph definition
  user: api1.getUser({ id: "1234" }, {
    _: "selectAll",
    posts: [{ filter: "top" }, { _: "selectAll", title: true, slug: true }],
  }),
  posts: api1.getPosts({ filter: "today" }, { _: "selectAll" }),
});

const prepared = gqlClient.prepareQuery((args: { filter: string }) => ({
  posts2: api1.getPosts({ filter: args.filter }, { _: "selectAll" }),
}));

const { posts2 } = await prepared.do({ filter: "hey" });
