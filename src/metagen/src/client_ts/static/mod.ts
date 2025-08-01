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

  for (const [nodeName, metaFn] of metas) {
    foundNodes.delete(nodeName);

    const nodeSelection = selection[nodeName];
    if (!nodeSelection && !selectAll) {
      // this node was not selected
      continue;
    }

    const { argumentTypes, subNodes, variants, inputFiles } = metaFn();

    const nodeInstances = nodeSelection instanceof Alias
      ? nodeSelection.aliases()
      : { [nodeName]: nodeSelection };

    for (
      const [instanceName, instanceSelection] of Object.entries(
        nodeInstances,
      )
    ) {
      if (!instanceSelection && !selectAll) {
        continue;
      }
      if (instanceSelection instanceof Alias) {
        throw new Error(
          `nested Alias discovered at ${parentPath}.${instanceName}`,
        );
      }
      const node: SelectNode = { instanceName, nodeName, files: inputFiles };

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

      if (subNodes || variants) {
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
        if (subSelections == undefined) {
          subSelections = {
            _: selection._,
          };
        }
        if (typeof subSelections != "object") {
          throw new Error(
            `node at ${parentPath}.${nodeName} ` +
              `is a no argument composite but first element of ` +
              `selection is typeof ${typeof nodeSelection}`,
          );
        }

        if (subNodes) {
          if (variants) {
            throw new Error(
              "unreachable: union/either NodeMetas can't have subnodes",
            );
          }

          // skip non explicit composite selection when using selectAll
          if (subSelections?._ === "selectAll" && !instanceSelection) {
            continue;
          }

          node.subNodes = _selectionToNodeSet(
            // assume it's a Selection. If it's an argument
            // object, mismatch between the node desc should hopefully
            // catch it
            subSelections as Selection,
            subNodes,
            `${parentPath}.${instanceName}`,
          );
        } else {
          const unionSelections = {} as Record<string, SelectNode[]>;
          const foundVariants = new Set([...Object.keys(subSelections)]);
          for (const [variantTy, variant_meta_fn] of variants!) {
            const variant_meta = variant_meta_fn();
            // this union member is a scalar
            if (!variant_meta.subNodes) {
              continue;
            }
            foundVariants.delete(variantTy);
            const variant_select = subSelections[variantTy];
            const nodes = variant_select
              ? _selectionToNodeSet(
                variant_select as Selection,
                variant_meta.subNodes,
                `${parentPath}.${instanceName}.variant(${variantTy})`,
              )
              : [];
            nodes.push({
              nodeName: "__typename",
              instanceName: "__typename",
            });
            unionSelections[variantTy] = nodes;
          }
          if (foundVariants.size > 0) {
            throw new Error(
              `node at ${parentPath}.${instanceName} ` +
                "has none of the variants called " +
                [...foundVariants.keys()],
            );
          }
          node.subNodes = unionSelections;
        }
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

type SubNodes = undefined | SelectNode[] | Record<string, SelectNode[]>;

type SelectNode<_Out = unknown> = {
  nodeName: string;
  instanceName: string;
  args?: NodeArgs;
  subNodes?: SubNodes;
  files?: TypePath[];
};

export class QueryNode<Out> {
  #inner: SelectNode<Out>;
  constructor(inner: SelectNode<Out>) {
    this.#inner = inner;
  }

  inner() {
    return this.#inner;
  }
}

export class MutationNode<Out> {
  #inner: SelectNode<Out>;
  constructor(inner: SelectNode<Out>) {
    this.#inner = inner;
  }

  inner() {
    return this.#inner;
  }
}

type SelectNodeOut<T> = T extends QueryNode<infer O> | MutationNode<infer O> ? O
  : never;
type QueryOut<T> = T extends
  Record<string, QueryNode<unknown> | MutationNode<unknown>> ? {
    [K in keyof T]: SelectNodeOut<T[K]>;
  }
  : T extends QueryNode<unknown> | MutationNode<unknown> ? SelectNodeOut<T>
  : never;

type TypePath = ("?" | "[]" | `.${string}`)[];
type ValuePath = ("" | `[${number}]` | `.${string}`)[];

class FileExtractor {
  #path: TypePath = [];
  #currentPath: ValuePath = [];
  #files: Map<string, File> = new Map();

  static extractFrom(key: string, object: unknown, paths: TypePath[]) {
    const extractor = new FileExtractor();
    if (!object || typeof object !== "object") {
      throw new Error("expected object");
    }
    for (const path of paths) {
      if (path[0] && path[0].startsWith("." + key)) {
        extractor.#currentPath = [];
        extractor.#path = path;
        extractor.#extractFromValue(object);
      }
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
    return this.#currentPath
      .map((seg) => {
        if (seg.startsWith("[")) {
          return `.${seg.slice(1, -1)}`;
        }
        return seg;
      })
      .join("");
  }
}

type NodeMeta = {
  subNodes?: [string, () => NodeMeta][];
  variants?: [string, () => NodeMeta][];
  argumentTypes?: { [name: string]: string };
  inputFiles?: TypePath[];
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

type ScalarSelectNoArgs = boolean | Alias<true> | null | undefined;

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
  constructor(aliases: Record<string, T>) {
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

function convertQueryNodeGql(
  typeToGqlTypeMap: Record<string, string>,
  node: SelectNode,
  variables: Map<string, NodeArgValue>,
  files: Map<string, File>,
) {
  let out = node.nodeName == node.instanceName
    ? node.nodeName
    : `${node.instanceName}: ${node.nodeName}`;

  const args = node.args;
  if (args && Object.keys(args).length > 0) {
    const argsRow = [];

    for (const [key, val] of Object.entries(args)) {
      const name = `in${variables.size}`;
      const obj = { [key]: val.value };

      if (node.files && node.files.length > 0) {
        const extractedFiles = FileExtractor.extractFrom(key, obj, node.files);

        for (const [path, file] of extractedFiles) {
          const pathInVariables = path.replace(/^\.[^\.\[]+/, `.${name}`);
          files.set(pathInVariables, file);
        }
      }

      val.value = obj[key];
      variables.set(name, val);
      argsRow.push(`${key}: $${name}`);
    }

    out = `${out} (${argsRow.join(", ")})`;
  }

  const subNodes = node.subNodes;
  if (subNodes) {
    if (Array.isArray(subNodes)) {
      out = `${out} { ${
        subNodes
          .map((node) =>
            convertQueryNodeGql(typeToGqlTypeMap, node, variables, files)
          )
          .join(" ")
      } }`;
    } else {
      out = `${out} { ${
        Object.entries(subNodes)
          .map(([variantTy, variantSubNodes]) => {
            let gqlTy = typeToGqlTypeMap[variantTy];
            if (!gqlTy) {
              throw new Error(
                `unreachable: no graphql type found for variant ${variantTy}`,
              );
            }
            gqlTy = gqlTy.replace(/[!]+$/, "");
            return `... on ${gqlTy} {${
              variantSubNodes
                .map((node) =>
                  convertQueryNodeGql(
                    typeToGqlTypeMap,
                    node,
                    variables,
                    files,
                  )
                )
                .join(" ")
            }}`;
          })
          .join(" ")
      } }`;
    }
  }
  return out;
}

function buildGql(
  typeToGqlTypeMap: Record<string, string>,
  query: Record<string, SelectNode>,
  ty: "query" | "mutation",
  // deno-lint-ignore no-inferrable-types
  name: string = "",
) {
  const variables = new Map<string, NodeArgValue>();
  const files = new Map<string, File>();

  const rootNodes = Object.entries(query)
    .map(([key, node]) => {
      const fixedNode = { ...node, instanceName: key };
      return convertQueryNodeGql(typeToGqlTypeMap, fixedNode, variables, files);
    })
    .join("\n  ");

  let argsRow = [...variables.entries()]
    .map(([key, val]) => `$${key}: ${typeToGqlTypeMap[val.typeName]} `)
    .join(", ");
  if (argsRow.length > 0) {
    // graphql doesn't like empty parentheses so we only
    // add them if there are args
    argsRow = `(${argsRow})`;
  }

  const doc = `${ty} ${name}${argsRow} {
  ${rootNodes}
      } `;
  return {
    doc,
    variables: Object.fromEntries(
      [...variables.entries()].map(([key, val]) => [key, val.value]),
    ),
    files,
  };
}

async function fetchGql(
  addr: URL,
  doc: string,
  variables: Record<string, unknown>,
  options: GraphQlTransportOptions,
  files?: Map<string, File>,
) {
  let body: FormData | string = JSON.stringify({
    query: doc,
    variables,
  });

  const additionalHeaders: HeadersInit = {};

  if (files && files.size > 0) {
    const data = new FormData();
    const fileMap = new Map<File, string[]>();
    const map: Record<string, string[]> = {};

    for (const [path, file] of files) {
      const array = fileMap.get(file);
      const variable = "variables" + path;
      if (array) {
        array.push(variable);
      } else {
        fileMap.set(file, [variable]);
      }
    }

    let index = 0;
    for (const [file, variables] of fileMap) {
      const key = index.toString();
      map[key] = variables;
      data.set(key, file);
      index += 1;
    }

    data.set("operations", body);
    data.set("map", JSON.stringify(map));

    body = data;
  } else {
    additionalHeaders["content-type"] = "application/json";
  }

  const fetchImpl = options.fetch ?? fetch;
  const res = await fetchImpl(addr, {
    ...options,
    method: "POST",
    headers: {
      accept: "application/json",
      ...additionalHeaders,
      ...(options.headers ?? {}),
    },
    body,
  });

  if (!res.ok) {
    const body = await res.text().catch((err) => `error reading body: ${err} `);
    throw new (Error as ErrorPolyfill)(
      `graphql request to ${addr} failed with status ${res.status}: ${body} `,
      {
        cause: {
          response: res,
          body,
        },
      },
    );
  }
  if (res.headers.get("content-type") != "application/json") {
    throw new (Error as ErrorPolyfill)("unexpected content type in response", {
      cause: {
        response: res,
        body: await res.text().catch((err) => `error reading body: ${err} `),
      },
    });
  }
  return (await res.json()) as { data: unknown; errors?: object[] };
}

/**
 * Access the typegraph over it's exposed GraphQL API.
 */
export class GraphQLTransport {
  constructor(
    public address: URL,
    public options: GraphQlTransportOptions,
    private typeToGqlTypeMap: Record<string, string>,
  ) {}

  protected async request(
    doc: string,
    variables: Record<string, unknown>,
    options: GraphQlTransportOptions,
    files?: Map<string, File>,
  ) {
    const res = await fetchGql(
      this.address,
      doc,
      variables,
      { ...this.options, ...options },
      files,
    );
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
  async query<
    Q extends QueryNode<unknown> | Record<string, QueryNode<unknown>>,
  >(
    query: Q,
    {
      options,
      name = "",
    }: {
      options?: GraphQlTransportOptions;
      name?: string;
    } = {},
  ): Promise<QueryOut<Q>> {
    const isNode = query instanceof QueryNode;
    const { variables, doc } = buildGql(
      this.typeToGqlTypeMap,
      isNode ? { value: query.inner() } : Object.fromEntries(
        Object.entries(query).map(([key, val]) => [
          key,
          (val as QueryNode<unknown>).inner(),
        ]),
      ),
      "query",
      name,
    );
    let result = await this.request(doc, variables, options ?? {});

    if (isNode) {
      result = (result as { value: SelectNodeOut<Q> }).value;
    }

    return result as QueryOut<Q>;
  }

  /**
   * Make a mutation request to the typegraph.
   */
  async mutation<
    Q extends MutationNode<unknown> | Record<string, MutationNode<unknown>>,
  >(
    query: Q,
    {
      options,
      name = "",
    }: {
      options?: GraphQlTransportOptions;
      name?: string;
    } = {},
  ): Promise<QueryOut<Q>> {
    const isNode = query instanceof MutationNode;
    const { variables, doc, files } = buildGql(
      this.typeToGqlTypeMap,
      isNode ? { value: query.inner() } : Object.fromEntries(
        Object.entries(query).map(([key, val]) => [
          key,
          (val as MutationNode<unknown>).inner(),
        ]),
      ),
      "mutation",
      name,
    );
    let result = await this.request(doc, variables, options ?? {}, files);

    if (isNode) {
      result = (result as { value: SelectNodeOut<Q> }).value;
    }

    return result as QueryOut<Q>;
  }

  /**
   * Prepare an ahead of time query {@link PreparedRequest}.
   */
  prepareQuery<
    T extends JsonObject,
    Q extends QueryNode<unknown> | Record<string, QueryNode<unknown>>,
  >(
    fun: (args: PreparedArgs<T>) => Q,
    { name = "" }: { name?: string } = {},
  ): PreparedRequest<T, Q> {
    return new PreparedRequest(
      (doc, vars, opts) => this.request(doc, vars, opts),
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
    Q extends MutationNode<unknown> | Record<string, MutationNode<unknown>>,
  >(
    fun: (args: PreparedArgs<T>) => Q,
    { name = "" }: { name?: string } = {},
  ): PreparedRequest<T, Q> {
    return new PreparedRequest(
      (doc, vars, opts) => this.request(doc, vars, opts),
      this.typeToGqlTypeMap,
      fun,
      "mutation",
      name,
    );
  }
}
// metagen-genif HOSTCALL

export class HostcallTransport extends GraphQLTransport {
  constructor(
    private gqlFn: (
      doc: string,
      variables: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>,
    options: GraphQlTransportOptions,
    typeToGqlTypeMap: Record<string, string>,
  ) {
    super(
      new URL("hostcall://this_url_will_never_be_used"),
      options,
      typeToGqlTypeMap,
    );
  }

  protected override async request(
    doc: string,
    variables: Record<string, unknown>,
    _options: GraphQlTransportOptions,
    files?: Map<string, File>,
  ) {
    if (files && files.size > 0) {
      throw new Error("no support for file upload on HostcallTransport");
    }
    const res = await this.gqlFn(doc, variables);
    if ("errors" in res) {
      throw new (Error as ErrorPolyfill)("graphql errors on response", {
        cause: res.errors,
      });
    }
    return res.data;
  }
}
// metagen-endif

/**
 * Prepares the GraphQL string ahead of time and allows re-use
 * avoid the compute and garbage overhead of re-building it for
 * repeat queries.
 */
export class PreparedRequest<
  T extends JsonObject,
  Q extends
    | QueryNode<unknown>
    | MutationNode<unknown>
    | Record<string, QueryNode<unknown> | MutationNode<unknown>>,
> {
  public doc: string;
  #mappings: Record<string, unknown>;
  private singleNode: boolean;

  constructor(
    // private address: URL,
    // private options: GraphQlTransportOptions,
    private gqlFn: (
      doc: string,
      variables: Record<string, unknown>,
      opts: GraphQlTransportOptions,
    ) => Promise<unknown>,
    typeToGqlTypeMap: Record<string, string>,
    fun: (args: PreparedArgs<T>) => Q,
    ty: "query" | "mutation",
    name: string = "",
  ) {
    const args = new PreparedArgs<T>();
    const dryRunNode = fun(args);
    const isSingleNode = dryRunNode instanceof QueryNode ||
      dryRunNode instanceof MutationNode;
    // FIXME: file support for prepared requets
    const { doc, variables } = buildGql(
      typeToGqlTypeMap,
      isSingleNode ? { value: dryRunNode.inner() } : Object.fromEntries(
        Object.entries(dryRunNode).map(([key, val]) => [
          key,
          (val as MutationNode<unknown>).inner(),
        ]),
      ),
      ty,
      name,
    );
    this.doc = doc;
    this.#mappings = variables;
    this.singleNode = isSingleNode;
  }

  resolveVariables(args: T, mappings: Record<string, unknown>) {
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
  async perform(args: T, opts?: GraphQlTransportOptions): Promise<QueryOut<Q>> {
    const resolvedVariables = this.resolveVariables(args, this.#mappings);
    // console.log(this.doc, {
    //   resolvedVariables,
    //   mapping: this.#mappings,
    // });
    let result = await this.gqlFn(this.doc, resolvedVariables, {
      ...opts,
    });
    if (this.singleNode) {
      result = (result as { value: SelectNodeOut<Q> }).value;
    }
    return result as QueryOut<Q>;
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
// metagen-genif IGNORE
// type will be sourced from fdk.ts which is guranteed avail
// when HOSTCALL flag is set
// deno-lint-ignore no-explicit-any
type Deployment = any;
// metagen-endif

export class Transports {
  /**
   * Get the {@link GraphQLTransport} for the typegraph.
   */
  static graphql(
    qg: _QueryGraphBase,
    addr: URL | string,
    options?: GraphQlTransportOptions,
  ) {
    return new GraphQLTransport(
      new URL(addr),
      options ?? {},
      qg.typeNameMapGql,
    );
  }
  // metagen-genif HOSTCALL

  static hostcall(
    qg: _QueryGraphBase,
    tg: Deployment,
    options?: Pick<GraphQlTransportOptions, "headers">,
  ) {
    return new HostcallTransport(
      (doc, vars) => tg.gql([doc]).run(vars),
      options ?? {},
      qg.typeNameMapGql,
    );
  }
  // metagen-endif
}

class _QueryGraphBase {
  constructor(public typeNameMapGql: Record<string, string>) {}
}

// -------------------------------------------------- //
