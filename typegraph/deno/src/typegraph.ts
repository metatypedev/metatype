import * as t from "./types.ts";
import { core } from "../gen/typegraph_core.js";

type Exports = Record<string, t.Func>;

interface QueriesDef {
  dynamic: boolean;
  folder?: string;
  operations?: string[];
}

interface TypegraphArgs {
  name: string;
  queries?: QueriesDef;
  builder: TypegraphBuilder;
}

type TypegraphBuilder = (expose: (exports: Exports) => void) => void;

export function typegraph(
  name: string,
  builder: TypegraphBuilder,
): void;
export function typegraph(
  args: TypegraphArgs,
): void;
export function typegraph(
  args: Omit<TypegraphArgs, "builder">,
  builder: TypegraphBuilder,
): void;
export function typegraph(
  nameOrArgs: string | TypegraphArgs | Omit<TypegraphArgs, "builder">,
  maybeBuilder?: TypegraphBuilder,
): void {
  const args = typeof nameOrArgs === "string"
    ? { name: nameOrArgs }
    : nameOrArgs;

  const { name } = args;
  const builder = "builder" in args
    ? args.builder as TypegraphBuilder
    : maybeBuilder!;

  const queries = args.queries ?? {
    dynamic: false,
    endpoints: [],
  };

  core.initTypegraph({ name });

  builder((exports) => {
    core.expose(
      Object.entries(exports).map(([name, fn]) => [name, fn._id]),
      [],
    );
  });

  console.log(core.finalizeTypegraph());
}
