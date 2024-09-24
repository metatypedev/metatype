function _selectionToNodeSet(
  selection: Selection,
  metas: [string, () => NodeMeta][],
  parentPath: string,
): SelectNode<unknown>[] {
  const out = [] as SelectNode[];
  const selectAll = selection._ == "selectAll";
  // set of the user specified nodes to do sanity
  // check at the end
  const foundNodes = new Set(Object.keys(selection));

  for (
    const [nodeName, metaFn] of metas
  ) {
    foundNodes.delete(nodeName);

    const nodeSelection = selection[nodeName];
    if (!nodeSelection && !selectAll) {
      // this node was not selected
      continue;
    }

    const { argumentTypes, subNodes } = metaFn();

    const nodeInstances = nodeSelection instanceof Alias
      ? nodeSelection.aliases()
      : { [nodeName]: nodeSelection };

    for (
      const [instanceName, instanceSelection] of Object.entries(nodeInstances)
    ) {
      if (!instanceSelection && !selectAll) {
        continue;
      }
      if (instanceSelection instanceof Alias) {
        throw new Error(
          `nested Alias discovored at ${parentPath}.${instanceName}`,
        );
      }
      const node: SelectNode = { instanceName, nodeName };

      if (argumentTypes) {
        // make sure the arg is of the expected form
        let arg = instanceSelection;
        if (Array.isArray(arg)) {
          arg = arg[0];
        }
        // TODO: consider bringing in Zod (after hoisting impl into common lib)
        if (typeof arg != "object" || arg === null) {
          throw new Error(
            `node at ${parentPath}.${instanceName} is a node ` +
              `that requires arguments object but detected argument ` +
              `is typeof ${typeof arg}`,
          );
        }

        const expectedArguments = new Map(Object.entries(argumentTypes));
        node.args = {};
        for (const [key, value] of Object.entries(arg)) {
          const typeName = expectedArguments.get(key);
          // TODO: consider logging a warning if `_` is detected incase user passes
          // Selection as arg
          if (!typeName) {
            throw new Error(
              `unexpected argument ${key} at ${parentPath}.${instanceName}`,
            );
          }
          expectedArguments.delete(key);
          node.args[key] = { typeName, value };
        }
      }

      if (subNodes) {
        // sanity check selection object
        let subSelections = instanceSelection;
        if (argumentTypes) {
          if (!Array.isArray(subSelections)) {
            throw new Error(
              `node at ${parentPath}.${instanceName} ` +
                `is a composite that takes an argument ` +
                `but selection is typeof ${typeof subSelections}`,
            );
          }
          subSelections = subSelections[1];
        } else if (Array.isArray(subSelections)) {
          throw new Error(
            `node at ${parentPath}.${instanceName} ` +
              `is a composite that takes no arguments ` +
              `but selection is typeof ${typeof subSelections}`,
          );
        }
        if (typeof subSelections != "object") {
          throw new Error(
            `node at ${parentPath}.${nodeName} ` +
              `is a no argument composite but first element of ` +
              `selection is typeof ${typeof nodeSelection}`,
          );
        }

        node.subNodes = _selectionToNodeSet(
          // assume it's a Selection. If it's an argument
          // object, mismatch between the node desc should hopefully
          // catch it
          subSelections as Selection,
          subNodes,
          `${parentPath}.${instanceName}`,
        );
      }

      out.push(node);
    }
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

/* Query node types section */

type SelectNode<_Out = unknown> = {
  nodeName: string;
  instanceName: string;
  args?: NodeArgs;
  subNodes?: SelectNode[];
};

export class QueryNode<Out> {
  #inner: SelectNode<Out>;
  constructor(
    inner: SelectNode<Out>,
  ) {
    this.#inner = inner;
  }

  inner() {
    return this.#inner;
  }
}

type ObjectPath = ("?" | "[]" | `.${string}`)[];
type EffectiveObjectPath = ("" | `[${number}]` | `.${string}`)[];

export class MutationNode<Out> {
  #inner: SelectNode<Out>;
  #files: ObjectPath[];
  constructor(
    inner: SelectNode<Out>,
    files: ObjectPath[],
  ) {
    this.#inner = inner;
    this.#files = files;
  }

  inner() {
    return this.#inner;
  }

  files() {
    return this.#files;
  }
}

class FileExtractor {
  #path: ObjectPath = [];
  #currentPath: EffectiveObjectPath = [];
  #files: Map<string, File> = new Map();

  static extractFrom(object: unknown, paths: ObjectPath[]) {
    const extractor = new FileExtractor();
    if (!object || typeof object !== "object") {
      throw new Error("expected object");
    }
    for (const path of paths) {
      extractor.#currentPath = [];
      extractor.#path = path;
      extractor.#extractFromValue(object);
    }
    return extractor.#files;
  }

  #extractFromValue(value: unknown) {
    const nextSegment = this.#path[this.#currentPath.length];
    if (nextSegment === "?") {
      if (value === null || value === undefined) {
        return;
      }
      this.#currentPath.push("");
      this.#extractFromValue(value);
      this.#currentPath.pop();
      return;
    }

    if (nextSegment === "[]") {
      if (!Array.isArray(value)) {
        throw new Error(`Expected array at ${this.#formatPath()}`);
      }
      for (let i = 0; i < value.length; i++) {
        this.#currentPath.push(`[${i}]`);
        this.#extractFromArray(value, i);
        this.#currentPath.pop();
      }
      return;
    }

    if (nextSegment.startsWith(".")) {
      if (typeof value !== "object" || value === null) {
        throw new Error(`Expected non-null object at ${this.#formatPath()}`);
      }
      this.#currentPath.push(nextSegment);
      this.#extractFromObject(
        value as Record<string, unknown>,
        nextSegment.slice(1),
      );
      this.#currentPath.pop();
      return;
    }
  }

  #extractFromObject(parent: Record<string, unknown>, key: string) {
    const value = parent[key];
    if (this.#currentPath.length == this.#path.length) {
      if (value instanceof File) {
        this.#files.set(this.#formatPath(), value);
        parent[key] = null;
        return;
      }
      throw new Error(`Expected File at ${this.#formatPath()}`);
    }

    this.#extractFromValue(value);
  }

  #extractFromArray(parent: unknown[], idx: number) {
    const value = parent[idx];
    if (this.#currentPath.length == this.#path.length) {
      if (value instanceof File) {
        this.#files.set(this.#formatPath(), value);
        parent[idx] = null;
        return;
      }
      throw new Error(`Expected File at ${this.#formatPath()}`);
    }

    this.#extractFromValue(value);
  }

  #formatPath() {
    return this.#currentPath.map((seg) => {
      if (seg.startsWith("[")) {
        return `.${seg.slice(1, -1)}`;
      }
      return seg;
    }).join("");
  }
}

type SelectNodeOut<T> = T extends (QueryNode<infer O> | MutationNode<infer O>)
  ? O
  : never;
type QueryDocOut<T> = T extends
  Record<string, QueryNode<unknown> | MutationNode<unknown>> ? {
    [K in keyof T]: SelectNodeOut<T[K]>;
  }
  : never;

type NodeMeta = {
  subNodes?: [string, () => NodeMeta][];
  argumentTypes?: { [name: string]: string };
};

/* Selection types section */

type SelectionFlags = "selectAll";

type Selection = {
  _?: SelectionFlags;
  [key: string]:
    | SelectionFlags
    | ScalarSelectNoArgs
    | ScalarSelectArgs<Record<string, unknown>>
    | CompositeSelectNoArgs<Selection | undefined>
    | CompositeSelectArgs<Record<string, unknown>, Selection>
    | Selection;
};

type ScalarSelectNoArgs =
  | boolean
  | Alias<true>
  | null
  | undefined;

type ScalarSelectArgs<ArgT extends Record<string, unknown>> =
  | ArgT
  | PlaceholderArgs<ArgT>
  | Alias<ArgT | PlaceholderArgs<ArgT>>
  | false
  | null
  | undefined;

type CompositeSelectNoArgs<SelectionT> =
  | SelectionT
  | Alias<SelectionT>
  | false
  | null
  | undefined;

type CompositeSelectArgs<ArgT extends Record<string, unknown>, SelectionT> =
  | [ArgT | PlaceholderArgs<ArgT>, SelectionT]
  | Alias<[ArgT | PlaceholderArgs<ArgT>, SelectionT]>
  | false
  | undefined
  | null;

/**
 * Request multiple instances of a single node under different
 * aliases. Look at {@link alias} for a functional way of instantiating
 * this class.
 */
export class Alias<T> {
  #aliases: Record<string, T>;
  constructor(
    aliases: Record<string, T>,
  ) {
    this.#aliases = aliases;
  }
  aliases() {
    return this.#aliases;
  }
}

/**
 * Request multiple instances of a single node under different
 * aliases.
 */
export function alias<T>(aliases: Record<string, T>): Alias<T> {
  return new Alias(aliases);
}

/* Argument types section */

type NodeArgValue = {
  typeName: string;
  value: unknown;
};

type NodeArgs = {
  [name: string]: NodeArgValue;
};

/**
 * This object is passed to closures used for preparing requests
 * ahead of time for {@link PreparedRequest}s. It allows one to
 * get {@link PlaceholderValue}s that can be used in place of node
 * arguments. At request time, the {@link PreparedRequest} then
 * takes an object that adheres to `T` that can then be used
 * to replace the placeholders.
 */
export class PreparedArgs<T extends Record<string, unknown>> {
  get(key: OnlyStringKeys<T>): PlaceholderValue<T[typeof key]> {
    return new PlaceholderValue(key);
  }
}

/**
 * Placeholder values for use by {@link PreparedRequest}
 */
export class PlaceholderValue<_T> {
  #key: string;
  constructor(key: string) {
    this.#key = key;
  }

  key() {
    return this.#key;
  }
}

export type PlaceholderArgs<T extends Record<string, unknown>> = {
  [K in keyof T]: PlaceholderValue<T[K]>;
};

/* GraphQL section */

/**
 * Options to be used for requests performed by {@link GraphQLTransport}.
 */
export type GraphQlTransportOptions = Omit<RequestInit, "body"> & {
  /**
   * {@link fetch} implementaiton to use. Defaults to the one found in the environment
   */
  fetch?: typeof fetch;
};

class GqlBuilder {
  #variables = new Map<string, NodeArgValue>();
  #files: Map<string, File> = new Map();

  #convertQueryNodeGql(
    node: SelectNode,
    files: ObjectPath[],
  ) {
    let out = node.nodeName == node.instanceName
      ? node.nodeName
      : `${node.instanceName}: ${node.nodeName}`;

    const filesByInputKey = new Map<string, ObjectPath[]>();
    for (const path of files) {
      const inKey = path[0].slice(1);
      const files = filesByInputKey.get(inKey);
      if (files) {
        files.push(path);
      } else {
        filesByInputKey.set(inKey, [path]);
      }
    }

    const args = node.args;
    if (args) {
      out = `${out} (${
        Object.entries(args)
          .map(([key, val]) => {
            const name = `in${this.#variables.size}`;
            const files = filesByInputKey.get(key);
            const object = { [key]: val.value };
            if (files && files.length > 0) {
              const extractedFiles = FileExtractor.extractFrom(object, files);
              for (const [path, file] of extractedFiles.entries()) {
                const pathInVariables = path.replace(/^\.[^\.\[]+/, `.${name}`);
                this.#files.set(pathInVariables, file);
              }
            }
            val.value = object[key]; // this might be null
            this.#variables.set(name, val);
            return `${key}: $${name}`;
          })
          .join(", ")
      })`;
    }

    const subNodes = node.subNodes;
    if (subNodes) {
      // FIXME can't we have file inputs in subnodes?
      out = `${out} { ${
        subNodes.map((node) => this.#convertQueryNodeGql(node, [])).join(" ")
      } }`;
    }
    return out;
  }

  static build(
    typeToGqlTypeMap: Record<string, string>,
    query: Record<string, [SelectNode, ObjectPath[]]>,
    ty: "query" | "mutation",
    name: string = "",
  ) {
    const builder = new GqlBuilder();

    const rootNodes = Object
      .entries(query)
      .map(([key, [node, files]]) => {
        const fixedNode = { ...node, instanceName: key };
        return builder.#convertQueryNodeGql(fixedNode, files);
      })
      .join("\n  ");

    let argsRow = [...builder.#variables.entries()]
      .map(([key, val]) => `$${key}: ${typeToGqlTypeMap[val.typeName]}`)
      .join(", ");
    if (argsRow.length > 0) {
      // graphql doesn't like empty parentheses so we only
      // add them if there are args
      argsRow = `(${argsRow})`;
    }

    const doc = `${ty} ${name}${argsRow} {
  ${rootNodes}
}`;
    return {
      doc,
      variables: Object.fromEntries(
        [...builder.#variables.entries()]
          .map(([key, val]) => [key, val.value]),
      ),
      files: builder.#files,
    };
  }
}

async function fetchGql(
  addr: URL,
  doc: string,
  variables: Record<string, unknown>,
  options: GraphQlTransportOptions,
  files?: Map<string, File>,
) {
  const multipart = (files?.size ?? 0) > 0;

  let body: FormData | string = JSON.stringify({
    query: doc,
    variables,
  });
  if (multipart) {
    const data = new FormData();
    data.set("operations", body);
    const map: Record<string, string[]> = {};
    for (const [i, [path, file]] of [...(files?.entries() ?? [])].entries()) {
      const key = `${i}`;
      // TODO single file on multiple paths
      map[key] = ["variables" + path];
      data.set(key, file);
    }
    data.set("map", JSON.stringify(map));
    body = data;
  }

  const additionalHeaders: HeadersInit = {};
  if (!multipart) {
    additionalHeaders["content-type"] = "application/json";
  }

  // console.log(doc, variables);
  const fetchImpl = options.fetch ?? fetch;
  const res = await fetchImpl(addr, {
    ...options,
    method: "POST",
    headers: {
      accept: "application/json",
      ...additionalHeaders,
      ...options.headers ?? {},
    },
    body,
  });
  if (!res.ok) {
    const body = await res.text().catch((err) => `error reading body: ${err}`);
    throw new (Error as ErrorPolyfill)(
      `graphql request to ${addr} failed with status ${res.status}: ${body}`,
      {
        cause: {
          response: res,
          body,
        },
      },
    );
  }
  if (res.headers.get("content-type") != "application/json") {
    throw new (Error as ErrorPolyfill)(
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

/**
 * Access the typegraph over it's exposed GraphQL API.
 */
export class GraphQLTransport {
  constructor(
    public address: URL,
    public options: GraphQlTransportOptions,
    private typeToGqlTypeMap: Record<string, string>,
  ) {
  }

  async #request(
    doc: string,
    variables: Record<string, unknown>,
    options?: GraphQlTransportOptions,
    files?: Map<string, File>,
  ) {
    const res = await fetchGql(this.address, doc, variables, {
      ...this.options,
      ...options,
    }, files);
    if ("errors" in res) {
      throw new (Error as ErrorPolyfill)("graphql errors on response", {
        cause: res.errors,
      });
    }
    return res.data;
  }

  /**
   * Make a query request to the typegraph.
   */
  async query<Doc extends Record<string, QueryNode<unknown>>>(
    query: Doc,
    { options, name = "" }: {
      options?: GraphQlTransportOptions;
      name?: string;
    } = {},
  ): Promise<QueryDocOut<Doc>> {
    const { variables, doc } = GqlBuilder.build(
      this.typeToGqlTypeMap,
      Object.fromEntries(
        Object.entries(query).map((
          [key, val],
        ) => [key, [(val as QueryNode<unknown>).inner(), []]]),
      ),
      "query",
      name,
    );
    return await this.#request(doc, variables, options) as QueryDocOut<Doc>;
  }

  /**
   * Make a mutation request to the typegraph.
   */
  async mutation<Doc extends Record<string, MutationNode<unknown>>>(
    query: Doc,
    { options, name = "" }: {
      options?: GraphQlTransportOptions;
      name?: string;
    } = {},
  ): Promise<QueryDocOut<Doc>> {
    const { variables, doc, files } = GqlBuilder.build(
      this.typeToGqlTypeMap,
      Object.fromEntries(
        Object.entries(query).map((
          [key, val],
        ) => {
          const node = val as MutationNode<unknown>;
          return [key, [node.inner(), node.files()]];
        }),
      ),
      "mutation",
      name,
    );
    return await this.#request(doc, variables, options, files) as QueryDocOut<
      Doc
    >;
  }

  /**
   * Prepare an ahead of time query {@link PreparedRequest}.
   */
  prepareQuery<
    T extends JsonObject,
    Doc extends Record<string, QueryNode<unknown>>,
  >(
    fun: (args: PreparedArgs<T>) => Doc,
    { name = "" }: { name?: string } = {},
  ): PreparedRequest<T, Doc> {
    return new PreparedRequest(
      this.address,
      this.options,
      this.typeToGqlTypeMap,
      fun,
      "query",
      name,
    );
  }

  /**
   * Prepare an ahead of time mutation {@link PreparedRequest}.
   */
  prepareMutation<
    T extends JsonObject,
    Q extends Record<string, MutationNode<unknown>>,
  >(
    fun: (args: PreparedArgs<T>) => Q,
    { name = "" }: { name?: string } = {},
  ): PreparedRequest<T, Q> {
    return new PreparedRequest(
      this.address,
      this.options,
      this.typeToGqlTypeMap,
      fun,
      "mutation",
      name,
    );
  }
}

/**
 * Prepares the GraphQL string ahead of time and allows re-use
 * avoid the compute and garbage overhead of re-building it for
 * repeat queries.
 */
export class PreparedRequest<
  T extends JsonObject,
  Doc extends Record<string, QueryNode<unknown> | MutationNode<unknown>>,
> {
  public doc: string;
  #mappings: Record<string, unknown>;
  public files: Map<string, File>;

  constructor(
    private address: URL,
    private options: GraphQlTransportOptions,
    typeToGqlTypeMap: Record<string, string>,
    fun: (args: PreparedArgs<T>) => Doc,
    ty: "query" | "mutation",
    name: string = "",
  ) {
    const args = new PreparedArgs<T>();
    const dryRunNode = fun(args);
    const { doc, variables, files } = GqlBuilder.build(
      typeToGqlTypeMap,
      Object.fromEntries(
        Object.entries(dryRunNode).map((
          [key, val],
        ) => {
          const node = val as MutationNode<unknown>;
          return [key, [node.inner(), node.files()]];
        }),
      ),
      ty,
      name,
    );
    this.doc = doc;
    this.#mappings = variables;
    this.files = files;
  }

  resolveVariables(
    args: T,
    mappings: Record<string, unknown>,
  ) {
    const resolvedVariables = {} as Record<string, unknown>;
    for (const [key, val] of Object.entries(mappings)) {
      if (val instanceof PlaceholderValue) {
        resolvedVariables[key] = args[val.key()];
      } else if (typeof val == "object" && val != null) {
        this.resolveVariables(args, val as JsonObject);
      } else {
        resolvedVariables[key] = val;
      }
    }
    return resolvedVariables;
  }

  /**
   * Execute the prepared request.
   */
  async perform(args: T, opts?: GraphQlTransportOptions): Promise<
    {
      [K in keyof Doc]: SelectNodeOut<Doc[K]>;
    }
  > {
    const resolvedVariables = this.resolveVariables(args, this.#mappings);
    // console.log(this.doc, {
    //   resolvedVariables,
    //   mapping: this.#mappings,
    // });
    const res = await fetchGql(
      this.address,
      this.doc,
      resolvedVariables,
      {
        ...this.options,
        ...opts,
      },
    );
    if ("errors" in res) {
      throw new (Error as ErrorPolyfill)("graphql errors on response", {
        cause: res.errors,
      });
    }
    return res.data as QueryDocOut<Doc>;
  }
}

/* Util types section */

type OnlyStringKeys<T extends Record<string, unknown>> = {
  [K in keyof T]: K extends string ? K : never;
}[keyof T];

type JsonLiteral = string | number | boolean | null;
type JsonObject = { [key: string]: Json };
type JsonArray = Json[];
type Json = JsonLiteral | JsonObject | JsonArray;

type ErrorPolyfill = new (msg: string, payload: unknown) => Error;

/* QueryGraph section */

class _QueryGraphBase {
  constructor(private typeNameMapGql: Record<string, string>) {}

  /**
   * Get the {@link GraphQLTransport} for the typegraph.
   */
  graphql(addr: URL | string, options?: GraphQlTransportOptions) {
    return new GraphQLTransport(
      new URL(addr),
      options ?? {},
      this.typeNameMapGql,
    );
  }
}

// -------------------------------------------------- //
