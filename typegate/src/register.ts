import { Engine, initTypegraph } from "./engine.ts";
import { redisConfig, RedisReplicatedMap } from "./redis.ts";
import { TypeGateRuntime } from "./runtimes/TypeGateRuntime.ts";

console.log("init replicated map");

const replicatedMap = await RedisReplicatedMap.init<Engine>(
  "typegraph",
  redisConfig,
  (engine) => JSON.stringify(engine.tg.tg),
  (payload) => initTypegraph(payload),
);

async function set(payload: string) {
  const engine = await initTypegraph(payload);

  if (engine.name !== "typegate") {
    await replicatedMap.set(engine.name, engine);
  }

  return engine.name;
}

async function remove(name: string): Promise<number> {
  if (name === "typegate" || !has(name)) {
    return 0;
  }
  await get(name)!.terminate();
  return replicatedMap.delete(name);
}

function list(): Engine[] {
  return Array.from(replicatedMap.memory.values());
}

function get(name: string): Engine | undefined {
  return replicatedMap.get(name);
}
function has(name: string): boolean {
  return replicatedMap.has(name);
}

export const register = {
  set,
  remove,
  list,
  get,
  has,
};

const typegateEngine = await initTypegraph(
  await Deno.readTextFile("./src/typegraphs/typegate.json"),
  { typegate: await TypeGateRuntime.init() },
);

// no need for a sync
replicatedMap.memory.set("typegate", typegateEngine);
replicatedMap.startSync();
