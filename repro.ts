import { connect } from "https://deno.land/x/redis@v0.27.0/mod.ts";

const conf = { hostname: "localhost", port: 6379, password: "password", db: 0 };
const r1 = await connect(conf);
const r2 = await connect(conf);

const key = "topic";

(async () => {
  let cursor = "$";
  while (true) {
    try {
      const [stream] = await r1.xread(
        [{ key, xid: cursor }],
        {
          block: 5000,
        },
      );
      if (!stream) {
        continue;
      }
      for (const { xid, fieldValues } of stream.messages) {
        console.log(fieldValues);
        cursor = xid;
      }
    } catch (error) {
      console.error(error);
    }
  }
})();

(async () => {
  let c = 0;
  while (true) {
    try {
      await r2.xadd(
        key,
        "*",
        { c },
        { approx: true, elements: 10 },
      );
      c += 1;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(error);
    }
  }
})();
