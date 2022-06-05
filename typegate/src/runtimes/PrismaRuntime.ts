import { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { Resolver, Runtime, RuntimeConfig } from "./Runtime.ts";
import * as native from "../../native/bindings/bindings.ts";
import { GraphQLRuntime } from "./GraphQLRuntime.ts";
import { ResolverError } from "../errors.ts";

const makeDatasource = (uri: string) => {
  const engine = (() => {
    if (uri.startsWith("postgres")) {
      return "postgresql";
    }
  })();
  return `
  datasource db {
    provider = "${engine}"
    url      = "${uri}"
  }
  `;
};

export class PrismaRuntime extends GraphQLRuntime {
  datamodel: string;
  key: string;

  private constructor(datamodel: string) {
    super("");
    this.datamodel = datamodel;
    this.key = "";
  }

  static async init(
    typegraph: TypeGraphDS,
    materializers: TypeMaterializer[],
    args: Record<string, unknown>,
    config: RuntimeConfig
  ): Promise<Runtime> {
    const schema = `${args.datasource}${args.datamodel}`;
    //console.log(schema);
    const instance = new PrismaRuntime(schema);
    await instance.registerEngine(typegraph.types[0].name);
    return instance;
  }

  async deinit(): Promise<void> {
    await this.unregisterEngine();
  }

  static async introspection(uri: string): Promise<string> {
    const intro = await native.prisma_introspection({
      datamodel: makeDatasource(uri),
    });
    return intro.introspection;
  }

  async registerEngine(typegraphName: string): Promise<void> {
    const conn = await native.prisma_register_engine({
      datamodel: this.datamodel,
      typegraph: typegraphName,
    });
    this.key = conn.engine_id;
  }

  async unregisterEngine(): Promise<void> {
    await native.prisma_unregister_engine({
      key: this.key,
    });
    this.key = "";
  }

  execute(query: string, variables: Record<string, unknown>): Resolver {
    return async (args) => {
      const startTime = performance.now();
      const ret = await native.prisma_query({
        key: this.key,
        query: {
          query,
          variables: {},
        },
        datamodel: this.datamodel,
      });
      const endTime = performance.now();
      console.log(`queried prisma in ${(endTime - startTime).toFixed(2)}ms`);
      const res = JSON.parse(ret.res);
      if ("errors" in res) {
        throw new ResolverError(
          res.errors
            .map((e: any) => e.user_facing_error?.message ?? e.error)
            .join("\n")
        );
      }
      return res.data;
    };
  }
}
