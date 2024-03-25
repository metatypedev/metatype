// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

/**
 * JsonPath query compiler: jsonpath query to javascript function;
 * to be used for getting context value.
 *
 * This only support a subset of the jsonpath spec (https://goessner.net/articles/JsonPath/).
 * The following are the supported features:
 *  - Object property access with dot notation or bracket notation
 *  - Array index access with bracket notation
 * Additionally we support omitting the leading "$" character or the leading "$." characters.
 */

export type ArrayIndex = {
  type: "array";
  index: number;
};

export type ObjectKey = {
  type: "object";
  key: string;
};

export type PathSegment = ArrayIndex | ObjectKey;

function parsePath(path: string): PathSegment[] {
  const parser = new PathParser(path);
  const res = parser.parse();
  return res;
}

class PathParser {
  #currentIndex = 0;
  #segments: PathSegment[] = [];
  #path: string;

  private static getEffectivePath(path: string) {
    if (path[0] === "$") {
      return path.slice(1);
    }
    if (path[0] === "." || path[0] === "[") {
      return path;
    }
    return "." + path;
  }

  constructor(path: string) {
    this.#path = PathParser.getEffectivePath(path);
  }
  parse(): PathSegment[] {
    while (this.#nextSegment());
    return this.#segments;
  }

  #nextSegment(): boolean {
    if (this.#currentIndex === this.#path.length) {
      return false;
    }

    const firstChar = this.#path[this.#currentIndex];
    if (firstChar === ".") {
      this.#currentIndex += 1;
      return this.#parseKey();
    }

    if (firstChar === "[") {
      this.#currentIndex += 1;
      return this.#parseIndex();
    }

    throw new Error(`Unexpected character: ${firstChar}`);
  }

  #parseKey(): boolean {
    let end = this.#currentIndex;
    for (; end < this.#path.length; end++) {
      if (this.#path[end] === "." || this.#path[end] === "[") {
        break;
      }
    }

    this.#segments.push({
      type: "object",
      key: this.#path.slice(this.#currentIndex, end),
    });
    this.#currentIndex = end;
    return true;
  }

  #parseIndex(): boolean {
    const firstChar = this.#path[this.#currentIndex];
    if (firstChar === '"') {
      return this.#parseStringIndex('"');
    }
    if (firstChar === "'") {
      return this.#parseStringIndex("'");
    }
    return this.#parseNumberIndex();
  }

  #parseStringIndex(quote: string): boolean {
    let end = this.#currentIndex + 1;
    for (; end < this.#path.length; end++) {
      if (this.#path[end] === quote && this.#path[end - 1] !== "\\") {
        const key = JSON.parse(this.#path.slice(this.#currentIndex, end + 1));
        if (typeof key !== "string") {
          throw new Error(`Unexpected: Invalid string index`);
        }
        this.#currentIndex = end;
        return this.#append({ type: "object", key }, 2); // closing quote and bracket
      }
    }

    const unterminated = this.#path.slice(this.#currentIndex);
    const position = this.#currentIndex;
    throw new Error(
      `Unterminated string index: '${unterminated}' at ${position}`,
    );
  }

  #parseNumberIndex(): boolean {
    let end = this.#currentIndex;
    for (; end < this.#path.length; end++) {
      if (this.#path[end] === "]") {
        const index = Number(this.#path.slice(this.#currentIndex, end));
        if (Number.isNaN(index)) {
          throw new Error(
            `Invalid number index: ${
              this.#path.slice(this.#currentIndex, end)
            }`,
          );
        }
        this.#currentIndex = end;
        return this.#append({ type: "array", index }, 1);
      }
    }

    const unterminated = this.#path.slice(this.#currentIndex);
    const position = this.#currentIndex;
    throw new Error(
      `Unterminated number index: '${unterminated}' at ${position}`,
    );
  }

  #append(segment: PathSegment, increment = 1) {
    this.#segments.push(segment);
    this.#currentIndex += increment;
    return true;
  }
}

function stringifySegment(segment: PathSegment): string {
  if (segment.type === "array") {
    return `[${segment.index}]`;
  }
  if (/^\w+$/.test(segment.key)) {
    return `.${segment.key}`;
  }
  return `[${JSON.stringify(segment.key)}]`;
}

export type QueryFn = (value: unknown) => unknown;

export type JsonPathQueryOptions = {
  strict: boolean;
  rootPath?: string;
};

export class QueryFunction {
  private constructor(private code: string) {}

  static create(path: string, options: JsonPathQueryOptions) {
    const compiler = new QueryFnCompiler(path, options);
    const body = compiler.compile();
    return new QueryFunction(body);
  }

  asFunction() {
    return new Function("initialValue", this.code) as QueryFn;
  }

  asFunctionDef(name: string) {
    if (/^[A-Za-z_]\w*$/.test(name)) {
      return `function ${name}(initialValue) {\n${this.code}\n}`;
    } else {
      throw new Error(`Invalid function name: ${name}`);
    }
  }
}

// if not strict, return undefined for unresolved path; otherwise throw...
class QueryFnCompiler {
  #lines: string[] = [];
  #path: PathSegment[];
  #currentIndex = 0;

  constructor(path: string, private options: JsonPathQueryOptions) {
    this.#path = parsePath(path);
  }

  compile() {
    this.#lines.push("let value = initialValue;");
    for (; this.#currentIndex < this.#path.length; this.#currentIndex++) {
      const segment = this.#path[this.#currentIndex];
      switch (segment.type) {
        case "array":
          this.#compileArraySegment(segment);
          break;
        case "object":
          this.#compileObjectSegment(segment);
          break;
      }
    }
    this.#lines.push("return value;");
    const compiled = this.#lines.join("\n");
    this.#lines = [];
    return compiled;
  }

  #compileArraySegment(segment: ArrayIndex) {
    if (this.options.strict) {
      this.#lines.push(`if (!Array.isArray(value)) {`);
      const error = `Expected an array at \`${this.#currentPath}\``;
      this.#lines.push(`  throw new Error(${JSON.stringify(error)});`);
      this.#lines.push(`}`);
    } else {
      this.#lines.push(`if (!Array.isArray(value)) return undefined;`);
    }
    this.#lines.push(`value = value[${segment.index}];`);

    if (this.options.strict) {
      this.#lines.push(`if (value === undefined) {`);
      const error2 =
        `Index ${segment.index} out of range at \`${this.#currentPath}\``;
      this.#lines.push(`  throw new Error(${JSON.stringify(error2)});`);
      this.#lines.push(`}`);
    }
  }

  #compileObjectSegment(segment: ObjectKey) {
    if (this.options.strict) {
      this.#lines.push(`if (typeof value !== "object" || value === null) {`);
      const error = `Expected an object at \`${this.#currentPath}\``;
      this.#lines.push(`  throw new Error(${JSON.stringify(error)});`);
      this.#lines.push(`}`);
    } else {
      this.#lines.push(
        `if (typeof value !== "object" || value === null) return undefined;`,
      );
    }
    this.#lines.push(`value = value[${JSON.stringify(segment.key)}];`);
    if (this.options.strict) {
      const error2 =
        `Property '${segment.key}' not found at \`${this.#currentPath}\``;
      this.#lines.push(`if (value === undefined) {`);
      this.#lines.push(`  throw new Error(${JSON.stringify(error2)});`);
      this.#lines.push(`}`);
    }
  }

  get #currentPath() {
    const rootPath = this.options.rootPath ?? "$";
    return rootPath + this.#path.slice(0, this.#currentIndex)
      .map(stringifySegment)
      .join("");
  }

  get #currentSegment() {
    return stringifySegment(this.#path[this.#currentIndex]);
  }
}
