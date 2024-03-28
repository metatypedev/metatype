import { WasiReactorOut } from "../bindings/bindings.ts";

type Tag = "ok" | "err";

interface PythonOutput {
  value: string, // json string
  tag: Tag
}

export function processOutput(out: WasiReactorOut): string {
  if ("Ok" in out) {
    // vm output is ok
    const py: PythonOutput = JSON.parse(out.Ok.res);
    if (py.tag == "err") {
      // python error
      throw Error(py.value);
    }
    return py.value;
  }
  // vm error
  throw Error(out.Err.message);
}
