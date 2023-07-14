import * as t from "./types.ts";
import { core } from "../gen/typegraph_core.js";
import { caller, dirname, fromFileUrl } from "./deps.ts";

type Exports = Record<string, t.Func>;

interface TypegraphArgs {
  name: string;
  dynamic?: boolean;
  folder?: string;
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

  const { name, dynamic, folder } = args;
  const builder = "builder" in args
    ? args.builder as TypegraphBuilder
    : maybeBuilder!;

  const file = caller();
  if (!file) {
    throw new Error("Could not determine caller file");
  }
  const path = dirname(fromFileUrl(file));

  core.initTypegraph({ name, dynamic, path, folder });

  builder((exports) => {
    core.expose(
      Object.entries(exports).map(([name, fn]) => [name, fn._id]),
      [],
    );
  });

  console.log(core.finalizeTypegraph());
}
