// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { QueryEngine } from "../../../src/engine/query_engine.ts";
import { FileExtractor } from "./file_extractor.ts";
import {
  Context,
  ContextEncoder,
  defaultContextEncoder,
  Expect,
  Query,
  Variables,
} from "./mod.ts";
import { findOperation } from "../../../src/transports/graphql/graphql.ts";
import { parse } from "graphql";
import { None } from "monads";
import { MetaTest } from "../test.ts";

export class GraphQLQuery extends Query {
  constructor(
    public query: string,
    context: Context,
    variables: Variables,
    headers: Record<string, string>,
    expects: Expect[],
    contextEncoder: ContextEncoder = defaultContextEncoder,
  ) {
    super(context, variables, headers, expects, contextEncoder);
  }

  protected clone(patch: (q: this) => void = (_q) => {}): this {
    const q = new (this.constructor as any)(
      this.query,
      this.context,
      this.variables,
      this.headers,
      this.expects,
      this.contextEncoder,
    );
    patch(q);
    return q;
  }

  json() {
    const { query, variables } = this;
    return { query, variables, operationName: null };
  }

  formData(files: Map<File, string[]>) {
    const data = new FormData();
    data.set("operations", JSON.stringify(this.json()));
    const map: Record<string, string[]> = {};
    for (const [i, [file, paths]] of [...files.entries()].entries()) {
      const key = `${i}`;
      map[key] = paths;
      data.set(key, file);
    }
    data.set("map", JSON.stringify(map));
    return data;
  }

  private extractFilesFromVars(): Map<File, string[]> {
    return new FileExtractor().extractFilesFromVars(this.variables);
  }

  async getRequest(url: string) {
    const { headers, context } = this;

    const defaults: Record<string, string> = {};

    if (Object.keys(context).length > 0) {
      defaults["Authorization"] = await this.contextEncoder(context);
    }

    const clean = (headers: Record<string, string>) => {
      for (const [k, v] of Object.entries(headers)) {
        if (v === "NULL") {
          delete headers[k];
        }
      }
      return headers;
    };

    const getContentLength = (length: number) => {
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === "content-length") {
          // skip if exist
          return {};
        }
      }
      return { "Content-Length": `${length}` } as Record<string, string>;
    };

    const files = this.extractFilesFromVars();
    if (files.size === 0) {
      const body = JSON.stringify(this.json());
      return new Request(url, {
        method: "POST",
        body,
        headers: clean({
          ...defaults,
          ...headers,
          ...getContentLength(body.length),
          "Content-Type": "application/json",
        }),
      });
    } else {
      const body = this.formData(files);
      const length = Array.from(body.entries()).reduce(
        (acc, [_, v]) => acc + (typeof v === "string" ? v.length : v.size),
        0,
      );

      return new Request(url, {
        method: "POST",
        body,
        headers: clean({
          ...defaults,
          ...headers,
          ...getContentLength(length),
          // "Content-Type": "multipart/form-data",
        }),
      });
    }
  }

  async planOn(engine: QueryEngine) {
    const [op, frags] = findOperation(parse(this.query), None);
    const [plan] = await engine.getPlan(op.unwrap(), frags, false, false);
    return plan;
  }

  async assertPlanSnapshot(t: MetaTest, engine: QueryEngine) {
    const plan = await this.planOn(engine);
    await t.assertSnapshot(plan.stages.map((s) => {
      return [
        s.id(),
        s.props.node,
        s.props.path.join("/"),
        s.props.outType.type,
        s.props.outType.title,
        s.props.excludeResult ?? false,
      ].join("  ");
    }));
  }
}
