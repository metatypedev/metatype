export type Message = {
  action: "call";
  modulePath: string;
  functionName: string;
  internals: void;
  args: Record<string, unknown>;
};
