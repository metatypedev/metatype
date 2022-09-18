interface TypeNodeBase {
  name: string;
  typedef: string;
  policies: Array<number>;
  runtime: number;
  data: TypeDataBase;
}

interface TypeDataBase {
  default_value?: unknown;
  injection?: unknown;
  inject?: unknown;
  random?: Record<string, Record<string, unknown>>;
}

// string is not scalar, it is a list of chars
export interface ScalarNode extends TypeNodeBase {
  typedef:
    | "integer"
    | "unsigned_integer"
    | "float"
    | "char"
    | "boolean"
    | "string"
    | "uuid"
    | "json"
    | "email"
    | "uri";
}

export interface QuantifierNode extends TypeNodeBase {
  typedef: "optional" | "list";
  data: TypeDataBase & {
    of: number;
  };
}

export interface OptionalNode extends QuantifierNode {
  typedef: "optional";
}

export interface ListNode extends QuantifierNode {
  typedef: "list";
}

export interface InjectionNode extends TypeNodeBase {
  typedef: "injection";
  data: TypeDataBase & {
    of: number;
  };
}

export interface LiteralNode extends TypeNodeBase {
  typedef: "literal";
  data: TypeDataBase & {
    value: unknown;
  };
}

export interface EnumNode extends TypeNodeBase {
  typedef: "enum";
  data: TypeDataBase & {
    one_of: Array<number>;
  };
}

export interface StructNode extends TypeNodeBase {
  typedef: "struct";
  data: TypeDataBase & {
    binds: Record<string, number>;
    renames: Record<string, string>;
  };
}

export interface FuncNode extends TypeNodeBase {
  typedef: "func" | "gen";
  data: TypeDataBase & {
    input: number;
    output: number;
    materializer: number;
  };
}

// datetime, date, ean, path, ip, phone, set, json, tuple, union

export type TypeNode =
  | ScalarNode
  | QuantifierNode
  | InjectionNode
  | LiteralNode
  | EnumNode
  | StructNode
  | FuncNode;
