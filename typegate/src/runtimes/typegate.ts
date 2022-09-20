// Copyright Metatype under the Elastic License 2.0.

import { Resolver, Runtime } from "./Runtime.ts";
import { ComputeStage, Engine } from "../engine.ts";
import { Register } from "../register.ts";
import config from "../config.ts";
import * as path from "std/path/mod.ts";
import { TypeNode } from "../type_node.ts";

interface StructField {
  name: string;
  typedef: string;
}

interface StructNode {
  name: string;
  typedef: "struct";
  fields: Record<string, StructField>;
}

interface FuncNode {
  name: string;
  typedef: "func" | "gen";
  fields: {
    input: StructField;
    output: StructField;
  };
}

type Node = StructNode | FuncNode;

interface Edge {
  from: Node;
  to: Node;
  name: string;
}

interface Graph {
  nodes: Node[];
  edges: Edge[];
}

interface FieldType {
  name: string;
  edges: number[];
}

interface GetNodeOptions {
  withEdges: boolean;
}

interface NodeWithEdges {
  node: Node;
  edges: Node[];
}

class GraphBuilder {
  private nodes: Node[] = [];
  private edges: Edge[] = [];

  constructor(private engine: Engine) {}

  private getFieldType(idx: number): FieldType {
    const type = this.type(idx);
    switch (type.typedef) {
      case "optional": {
        const { name, edges } = this.getFieldType(type.data.of as number);
        return {
          name: `${name}?`,
          edges,
        };
      }
      case "list": {
        const { name, edges } = this.getFieldType(type.data.of as number);
        return {
          name: `${name}[]`,
          edges,
        };
      }
      case "func": {
        const input = this.getFieldType(type.data.input as number);
        const output = this.getFieldType(type.data.output as number);
        return {
          name: `(${input.name})->${output.name}`,
          edges: [...input.edges, ...output.edges],
        };
      }
      case "gen": {
        const output = this.getFieldType(type.data.output as number);
        return { name: `()->${output.name}`, edges: [...output.edges] };
      }
      case "struct":
        if (
          Object.keys(type.data.binds as Record<string, number>).length === 0
        ) {
          return { name: "{}", edges: [] };
        }
        return { name: type.name, edges: [idx] };
      default:
        return { name: type.typedef, edges: [idx] };
    }
  }

  private getNode(
    type: TypeNode,
    { withEdges }: GetNodeOptions = { withEdges: false },
  ): NodeWithEdges | null {
    const { name, typedef, data } = type;
    if (typedef !== "struct") return null;

    const fields = {} as Record<string, StructField>;
    const edgeTargets: number[] = [];
    for (const [k, v] of Object.entries(data.binds as Record<string, number>)) {
      const fieldType = this.getFieldType(v);
      fields[k] = { name: this.type(v).name, typedef: fieldType.name };
      edgeTargets.push(...fieldType.edges);
    }

    const node: Node = { name, typedef, fields };

    if (!withEdges) return { node, edges: [] };

    const edges = edgeTargets.map((e) => this.getNode(this.type(e))?.node)
      .filter((node) => node) as Node[];
    return { node, edges };
  }

  private type(idx: number): TypeNode {
    return this.engine.tg.type(idx);
  }

  build(): Graph {
    const serialized_types = this.engine.tg.tg.types;
    for (const type of serialized_types) {
      const { node, edges } = this.getNode(type, { withEdges: true }) ??
        { node: null, edges: [] };
      if (!node) continue;
      this.nodes.push(node);

      const graphEdges = edges.map((target) => ({
        from: node,
        to: target,
        name: "",
      } as Edge));

      // TODO: why filter??
      this.edges.push(...graphEdges);
    }

    return { nodes: this.nodes, edges: this.edges };
  }
}

const localGraphs = ["introspection", "typegate", "test"];
const dirName = path.dirname(path.fromFileUrl(import.meta.url));

export class TypeGateRuntime extends Runtime {
  static singleton: TypeGateRuntime | null = null;

  private constructor(private register: Register) {
    super();
  }

  static init(register: Register): Runtime {
    if (!TypeGateRuntime.singleton) {
      TypeGateRuntime.singleton = new TypeGateRuntime(register);
    }
    return TypeGateRuntime.singleton;
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[] {
    const resolver: Resolver = (() => {
      const name = stage.props.materializer?.name;
      if (name === "addTypegraph") {
        return this.addTypegraph;
      }
      if (name === "removeTypegraph") {
        return this.removeTypegraph;
      }
      if (name === "typegraphs") {
        return this.typegraphs;
      }
      if (name === "typegraph") {
        return this.typegraph;
      }
      if (name === "typesAsGraph") {
        return this.typesAsGraph;
      }
      if (name === "serializedTypegraph") {
        return this.serializedTypegraph;
      }

      return async ({ _: { parent }, ...args }) => {
        const resolver = parent[stage.props.node];
        const ret = typeof resolver === "function"
          ? await resolver(args)
          : resolver;
        return ret;
      };
    })();

    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
    ];
  }

  typegraphs = () => {
    return this.register.list().map((e) => {
      const { name, typedef, data } = e.tg.type(0);
      return {
        name: e.name,
        url: () => `${config.tg_external_url}/${e.name}`,
        rootType: () => ({
          idx: 0,
          name,
          typedef,
          data: JSON.stringify(data),
        }),
      };
    });
  };

  typegraph = ({ name }: { name: string }) => {
    const tg = this.register.get(name);
    if (!tg) {
      return null;
    }
    return {
      name: tg.name,
      url: `${config.tg_external_url}/${tg.name}`,
    };
  };

  typesAsGraph = (
    { _: { parent: typegraph } }: { _: { parent: { name: string } } },
  ) => {
    const tg = this.register.get(typegraph.name);
    if (!tg) {
      return null;
    }

    const graph = new GraphBuilder(tg).build();
    return graph;
  };

  serializedTypegraph = (
    { _: { parent: typegraph } }: { _: { parent: { name: string } } },
  ) => {
    const tg = this.register.get(typegraph.name);
    if (!tg) {
      return null;
    }

    return JSON.stringify(tg.tg.tg);
  };

  addTypegraph = async ({ fromString }: { fromString: string }) => {
    const name = JSON.parse(fromString).types[0].name;

    if (localGraphs.includes(name)) {
      await Deno.writeTextFile(
        path.join(dirName, "../typegraphs", `${name}.json`),
        `${fromString}\n`,
      );
    } else {
      await this.register.set(fromString);
    }
    return { name };
  };

  removeTypegraph = ({ name }: { name: string }) => {
    return this.register.remove(name);
  };

  typenode = (
    { typegraphName, idx }: { typegraphName: string; idx: number },
  ) => {
    const engine = this.register.get(typegraphName);
    if (!engine) {
      return null;
    }
    const tg = engine.tg;
    const type = tg.type(idx);
    if (!type) {
      return null;
    }
    const { name, typedef, data } = type;
    return {
      idx,
      name,
      typedef,
      data: JSON.stringify(data),
    };
  };
}
