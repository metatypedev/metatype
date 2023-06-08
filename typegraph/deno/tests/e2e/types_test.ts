import { assertEquals } from "std/testing/asserts.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";
import { dirname, fromFileUrl, join, resolve } from "std/path/mod.ts";
import * as t from "../../src/types.ts";

const dirName = dirname(fromFileUrl(import.meta.url));

async function serialize(path: string): Promise<string> {
  const cmd = new Deno.Command(
    "cargo",
    {
      args: [
        "run",
        "-p",
        "meta-cli",
        "-F",
        "typegraph-next",
        "-q",
        "--",
        "serialize",
        "--pretty",
        "-f",
        resolve(dirName, path),
      ],
      stdout: "piped",
      stderr: "inherit",
    },
  );

  const out = await cmd.output();
  if (out.success) {
    const res = new TextDecoder().decode(out.stdout);
    return res;
  }
  throw new Error("Error");
}

Deno.test("types", async (t) => {
  assertSnapshot(t, await serialize("types.tg.ts"));
});
