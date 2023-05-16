// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

export interface Operations {
  query: string;
  operationName?: string;
  variables: Record<string, unknown>;
}

export async function parseRequest(request: Request): Promise<Operations> {
  const contentType = request.headers.get("content-type");
  console.log(contentType);
  switch (contentType) {
    case "application/json":
      return await request.json();

    case "multipart/form-data": {
      const data = await request.formData();
      return new FormDataParser(data).parse();
    }

    default:
      throw new Error(`Unsupported content type: '${contentType}'`);
  }
}

export class FormDataParser {
  constructor(private data: FormData) {}

  public parse(): Operations {
    const operations = this.getOperations();
    const map = this.getMap();

    this.applyMap(map, operations);

    return operations;
  }

  private getOperations(): Operations {
    const field = this.data.get("operations");
    if (typeof field !== "string") {
      throw new Error("");
    }

    const operations = JSON.parse(field);
    if (Array.isArray(operations)) {
      throw new Error("Multiple operations not supported");
    }
    if (typeof operations !== "object" || operations == null) {
      throw new Error("Operations must be a non-null object");
    }

    return operations;
  }

  private getMap(): Record<string, string[]> {
    const field = this.data.get("map");
    if (typeof field !== "string") {
      throw new Error("");
    }

    return JSON.parse(field);
  }

  private applyMap(map: Record<string, string[]>, operations: Operations) {
    for (const [key, paths] of Object.entries(map)) {
      const file = this.data.get(key);
      if (!(file instanceof File)) {
        throw new Error("Expected a file");
      }

      for (const p of paths) {
        const path = p.split(".");
        const last = path.pop();
        if (last == null) {
          throw new Error("Path cannot be empty");
        }
        const parentObj = path.reduce(
          (acc, p) => {
            return acc[p] as Record<string, unknown>;
          },
          operations as unknown as Record<string, unknown>,
        );
        if (parentObj[last] != null) {
          throw new Error("expected value to be null");
        }
        parentObj[last] = file;
      }
    }
  }
}
