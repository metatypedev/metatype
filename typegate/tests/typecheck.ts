// Copyright Metatype under the Elastic License 2.0.

// deno-lint-ignore-file no-unused-vars

import { z } from "zod";

const system = {
  string: {
    after: [],
    c: () => z.string(),
  },
  minString: {
    after: ["string", "maxString"],
    c: (c: z.ZodString, arg: number) => c.min(arg),
  },
  maxString: {
    after: ["string", "minString"],
    c: (c: z.ZodString, arg: number) => c.max(arg),
  },
  optional: {
    after: ["string", "nonEmptyString"], // all
    c: (c: z.ZodAny) => c.optional(),
  },
  list: {
    after: [],
    c: (arg: z.ZodTypeAny) => z.array(arg),
  },
  minList: {
    after: ["list"],
    c: <T extends z.ZodTypeAny>(c: z.ZodArray<T>, arg: number) => c.min(arg),
  },
  intList: {
    after: ["list"],
    c: <T extends z.ZodTypeAny>(c: z.ZodArray<T>) =>
      c.refine((x) => x.map((x) => z.number().int().parse(x))),
  },
  multipl3intList: {
    after: ["intList"],
  },
  struct: {
    after: [],
  },
  i18nStruct: {
    after: ["struct"],
    fields: ["fr", "en"],
  },
};

interface Check {
  name: string;
  code?: string;
}

interface Type {
  name: string; // auto gen if not given
  checks: Array<Check>; // Array<number>
  /*
  policies: Array<number>;
  runtime: number;
  default_value?: string;
  injection?: unknown;
  inject?: string;
  */
}

const string: Type = {
  name: "string",
  checks: [{
    name: "string",
  }],
};

const stringMin5: Type = {
  name: "stringMin5",
  checks: [{
    name: "string",
  }, {
    name: "min5",
    code: "v => v.length >= 5",
  }],
};

z.string().min(4).email().max(7);

const zodValidator = {};

/*

any
=
hash
type

comparable
<

numeric = comparable

bit 1

boxed vs unboxed

bytes 8
short 16
long 64
double 64

int = numeric
unsigned int = int | x > 0 or numeric
float = numeric
char = int
bool =
int = numeric
optional = countable

iterable ( x )
map
order-able ( x < iterable )
- sort
countable ( x < iterable )
- count
- empty
list = iterable(x) + countable + order-able

kv ( x, y )
map = iterable(kv)
struct = map | x in [...]
union ( x, y )

func
gen policies

sugar
regex


GraphQL
Int
Float
String
Boolean
ID
Object
scalar


optional
list

tuple
union

byte
literal
integer
unsigned_integer
float
char
boolean

string
uuid
json
email
uri
ean
path
ip
datetime
date
time

struct > graph

t.graph(t.integer())

t.object({
    "v": t.list(t.integer())
    "e": t.list(t.tuple(t.integer(), t.integer()))
}).refine(lambda g: all([]))



mapping
metatype → validation
metatype → property
metatype → graphql
*/
