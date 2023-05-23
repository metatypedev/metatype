// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export interface Operations {
  query: string;
  operationName?: string;
  variables: Record<string, unknown>;
}

const contentTypes = {
  json: "application/json",
  formData: "multipart/form-data",
} as const;

export async function parseRequest(request: Request): Promise<Operations> {
  const contentType = request.headers.get("content-type");

  if (contentType == null) {
    throw new Error("Content-Type header is required");
  }

  if (contentType.startsWith(contentTypes.json)) {
    // validate??
    return await request.json();
  }

  if (contentType.startsWith(contentTypes.formData)) {
    const data = await request.formData();
    return new FormDataParser(data).parse();
  }
  throw new Error(`Unsupported content type: '${contentType}'`);
}

/**
 * Used to parse request payload in multipart/form-data format into Operations
 */
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
