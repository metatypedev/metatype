import { Meta } from "../utils/mod.ts";

Meta.test("type comparison test", async (t) => {
  try {
    const _e = await t.engine("schema_validation/type_comparison.py");
    throw new Error("Expected an error"); // TODO assert
  } catch (err) {
    if (!err.stderr) {
      throw err;
    }
    const errStart = "typegraph.wit.ErrorStack: ";
    const errOutput = err.stderr.slice(
      err.stderr.indexOf(errStart) + errStart.length,
    );
    await t.assertSnapshot(errOutput, {
      name: "type comparison errors",
    });
    console.log(errOutput);
  }
});
