export type GraphQlTransportOptions = Omit<RequestInit, "body"> & {
  fetch?: typeof fetch;
};

export class GraphQLTransport {
  constructor(
    public address: URL,
    public options: GraphQlTransportOptions,
    private typeToGqlTypeMap: Record<string, string>,
  ) {
  }

  protected buildGql(
    query: Record<string, SelectNode>,
    ty: "query" | "mutation",
    name: string = "",
  ) {
    const variables = new Map<string, NodeArgValue>();
    const rootNodes = Object
      .entries(query)
      .map(([key, node]) => `${key}: ${convertQueryNodeGql(node, variables)}`)
      .join("\n  ");
    const argsRow = [...variables.entries()]
      .map(([key, val]) => `$${key}: ${this.typeToGqlTypeMap[val.typeName]}`)
      .join(", ");
    const doc = `${ty} ${name}(${argsRow}) {
  ${rootNodes}
}`;
    return {
      doc,
      variables: Object.fromEntries(
        [...variables.entries()]
          .map(([key, val]) => [key, val.value]),
      ),
    };
  }

  protected async fetch(
    doc: string,
    variables: Record<string, unknown>,
    options?: GraphQlTransportOptions,
  ) {
    // console.log({ doc, variables });
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
      const body = await res.text().catch((err) =>
        `error reading body: ${err}`
      );
      throw new Error(
        `graphql request to ${this.address} failed: ${body}`,
        {
          cause: {
            response: res,
            body,
          },
        },
      );
    }
    if (res.headers.get("content-type") != "application/json") {
      throw new Error(
        "unexpected content type in response",
        {
          cause: {
            response: res,
            body: await res.text().catch((err) => `error reading body: ${err}`),
          },
        },
      );
    }
    return await res.json() as { data: unknown; errors?: object[] };
  }

  async query<Doc extends Record<string, QueryNode<unknown>>>(
    query: Doc,
    options?: GraphQlTransportOptions,
  ): Promise<QueryDocOut<Doc>> {
    const { variables, doc } = this.buildGql(
      Object.fromEntries(
        Object.entries(query).map((
          [key, val],
        ) => [key, (val as QueryNode<unknown>).inner]),
      ),
      "query",
    );
    const res = await this.fetch(doc, variables, options);
    if ("errors" in res) {
      throw new Error("graphql errors on response", {
        cause: res.errors,
      });
    }
    return res.data as QueryDocOut<Doc>;
  }

  async mutation<Doc extends Record<string, QueryNode<unknown>>>(
    query: Doc,
    options?: GraphQlTransportOptions,
  ): Promise<QueryDocOut<Doc>> {
    const { variables, doc } = this.buildGql(
      Object.fromEntries(
        Object.entries(query).map((
          [key, val],
        ) => [key, (val as MutationNode<unknown>).inner]),
      ),
      "query",
    );
    const res = await this.fetch(doc, variables, options);
    if ("errors" in res) {
      throw new Error("graphql errors on response", {
        cause: res.errors,
      });
    }
    return res.data as QueryDocOut<Doc>;
  }

  prepareQuery<
    T extends JsonObject,
    Doc extends Record<string, QueryNode<unknown>>,
  >(
    fun: (args: T) => Doc,
  ): PreparedRequest<T, Doc> {
    return new PreparedRequest(
      this.address,
      this.options,
      this.typeToGqlTypeMap,
      fun,
      "query",
    );
  }

  prepareMutation<
    T extends JsonObject,
    Q extends Record<string, MutationNode<unknown>>,
  >(
    fun: (args: T) => Q,
  ): PreparedRequest<T, Q> {
    return new PreparedRequest(
      this.address,
      this.options,
      this.typeToGqlTypeMap,
      fun,
      "mutation",
    );
  }
}

const variablePath = Symbol("variablePath");
const pathSeparator = "%.%";

class PreparedRequest<
  T extends JsonObject,
  Doc extends Record<string, QueryNode<unknown> | MutationNode<unknown>>,
> extends GraphQLTransport {
  #doc: string;
  #mappings: Record<string, unknown>;

  constructor(
    address: URL,
    options: GraphQlTransportOptions,
    typeToGqlTypeMap: Record<string, string>,
    fun: (args: T) => Doc,
    ty: "query" | "mutation",
    name: string = "",
  ) {
    super(address, options, typeToGqlTypeMap);
    const rootId = "$root";
    const dryRunNode = fun(this.#getProxy(rootId) as unknown as T);
    const { doc, variables } = this.buildGql(
      Object.fromEntries(
        Object.entries(dryRunNode).map((
          [key, val],
        ) => [key, (val as MutationNode<unknown>).inner]),
      ),
      ty,
      name,
    );
    this.#doc = doc;
    this.#mappings = variables;
  }

  resolveVariable(
    args: T,
    cur: Json,
    path: string[],
    idx = 0,
  ): unknown {
    if (idx == path.length - 1) {
      return cur;
    }
    if (typeof cur != "object" || cur == null) {
      const curPath = path.slice(0, idx);
      throw new Error(
        `unexpected prepard request arguments shape: item at ${curPath} is not object when trying to access ${path}`,
        {
          cause: {
            args,
            curPath,
            curObj: cur,
            mappings: this.#mappings,
          },
        },
      );
    }
    const childIdx = idx + 1;
    return this.resolveVariable(
      args,
      (cur as JsonObject)[path[childIdx]],
      path,
      childIdx,
    );
  }

  #getProxy(path: string): { [variablePath]: string } {
    return new Proxy(
      { [variablePath]: path },
      {
        get: (target, prop, _reciever) => {
          if (prop === variablePath) {
            return path;
          }
          return this.#getProxy(
            `${target[variablePath]}${pathSeparator}${String(prop)}`,
          );
        },
      },
    );
  }

  async do(args: T, opts?: GraphQlTransportOptions): Promise<
    {
      [K in keyof Doc]: SelectNodeOut<Doc[K]>;
    }
  > {
    const resolvedVariables = {} as Record<string, unknown>;
    for (const [key, val] of Object.entries(this.#mappings)) {
      if (typeof val !== "object" || val == null || !(variablePath in val)) {
        throw new Error("impossible");
      }
      const path = (val[variablePath] as string).split(pathSeparator);
      resolvedVariables[key] = this.resolveVariable(args, args, path);
    }
    // console.log({
    //   resolvedVariables,
    //   doc: this.#doc,
    //   mapping: this.#mappings,
    // });
    const res = await this.fetch(this.#doc, resolvedVariables, opts);
    if ("errors" in res) {
      throw new Error("graphql errors on response", {
        cause: res.errors,
      });
    }
    return res.data as QueryDocOut<Doc>;
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

export type JsonLiteral = string | number | boolean | null;
export type JsonObject = { [key: string]: Json };
export type JsonArray = Json[];
export type Json = JsonLiteral | JsonObject | JsonArray;

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
  ) { }
}

export class MutationNode<Out> {
  constructor(
    public inner: SelectNode<Out>,
  ) { }
}

type SelectNodeOut<T> = T extends (QueryNode<infer O> | MutationNode<infer O>)
  ? O
  : never;
type QueryDocOut<T> = T extends
  Record<string, QueryNode<unknown> | MutationNode<unknown>> ? {
    [K in keyof T]: SelectNodeOut<T[K]>;
  }
  : never;

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
          `is a scalar that requires arguments but selection ` +
          `is typeof ${typeof nodeSelection}`,
        );
      }
      const [arg] = nodeSelection;
      // TODO: consider bringing in Zod (after hoisting impl into common lib)
      if (typeof arg != "object") {
        throw new Error(
          `node at ${parentPath}.${nodeName} is a scalar ` +
          `that requires argument object but first element of ` +
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
            `is a composite that takes an argument ` +
            `but selection is typeof ${typeof nodeSelection}`,
          );
        }
        subSelections = subSelections[1];
      } else if (Array.isArray(subSelections)) {
        throw new Error(
          `node at ${parentPath}.${nodeName} ` +
          `is a composite that takes no arguments ` +
          `but selection is typeof ${typeof nodeSelection}`,
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
    out = `${out} (${Object.entries(args)
      .map(([key, val]) => {
        const name = `in${variables.size}`;
        variables.set(name, val);
        return `${key}: $${name}`;
      })
      })`;
  }

  const subNodes = node.subNodes;
  if (subNodes) {
    out = `${out} { ${subNodes.map((node) => convertQueryNodeGql(node, variables)).join(" ")
      } }`;
  }
  return out;
}

class QueryGraphBase {
  constructor(private typeNameMapGql: Record<string, string>) { }

  graphql(addr: URL | string, options?: GraphQlTransportOptions) {
    return new GraphQLTransport(
      new URL(addr),
      options ?? {},
      this.typeNameMapGql,
    );
  }
}

// -------------------------------------------------- //
