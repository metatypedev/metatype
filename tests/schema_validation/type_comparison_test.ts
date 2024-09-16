import { Meta } from "../utils/mod.ts";

Meta.test("type comparision test", async (t) => {
  try {
    const _e = await t.engine("schema_validation/type_comparison.py");
  } catch (err) {
    const errStart = "typegraph.wit.ErrorStack: ";
    const errOutput = err.stderr.slice(
      err.stderr.indexOf(errStart) + errStart.length,
    );
    await t.assertSnapshot(errOutput, {
      name: "type comparison errors",
      msg: "type comparison errors do not match the snapshot",
    });
    console.log(errOutput);
  }
});
