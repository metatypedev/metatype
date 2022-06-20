import { intersect, withoutAll } from "std/collections/mod.ts";

export interface ReplaceDynamicPathParamsResult {
  pathname: string;
  restArgs: Record<string, any>;
}

export const replaceDynamicPathParams = (
  pathPattern: string,
  queryArgs: Record<string, any>,
): ReplaceDynamicPathParamsResult => {
  const restArgs = { ...queryArgs };
  const pathname = pathPattern.replace(
    /(?:\{(\w+)\}|\:(\w+))/g,
    (match, key1, key2) => {
      const key = key1 ?? key2;
      if (Object.hasOwnProperty.call(restArgs, key)) {
        const value = restArgs[key];
        delete restArgs[key];
        return value;
      } else {
        //? throw??
        return match;
      }
    },
  );
  return { pathname, restArgs };
};

interface FieldLists {
  query: string[];
  body: string[];
}

export interface MatOptions extends Record<string, any> {
  content_type: "application/json" | "application/x-www-form-urlencoded";
  query_fields: string[] | null;
  body_fields: string[] | null;
  auth_token_field: string | null;
}

// TODO: name clash case
/**
 * Select which fields of the input go in the query and which ones go in the body
 * @param method -- HTTP verb
 * @param args -- GraphQL query input, dynamic path params excluded
 * @param options -- options from the materializer
 * @returns list of fields for the query and the body
 *
 * If both field lists from `options` are `null`, all the fields go in the query
 * for GET and DELETE request, and in the body for POST, PUT and PATCH.
 * If one and only one of the given field lists is `null`, the
 * corresponding target will receive all the fields not specified in the
 * non-null list; except for GET and DELETE requests when the body field list,
 * the body field list will be empty.
 */
export const getFieldLists = (
  method: string,
  args: Record<string, any>,
  options: MatOptions,
): FieldLists => {
  const { query_fields, body_fields } = options;
  const fields = Object.keys(args);
  switch (method) {
    case "GET":
    case "DELETE":
      if (query_fields == null) {
        if (body_fields == null) {
          return {
            query: fields,
            body: [],
          };
        } else {
          return {
            query: withoutAll(fields, body_fields),
            body: intersect(fields, body_fields),
          };
        }
      } else {
        if (body_fields == null) {
          return {
            query: intersect(fields, query_fields),
            body: [],
          };
        } else {
          return {
            query: intersect(fields, query_fields),
            body: intersect(fields, body_fields),
          };
        }
      }

    case "POST":
    case "PUT":
    case "PATCH":
      if (query_fields == null) {
        if (body_fields == null) {
          return {
            query: [],
            body: fields,
          };
        } else {
          return {
            query: withoutAll(fields, body_fields),
            body: intersect(fields, body_fields),
          };
        }
      } else {
        if (body_fields == null) {
          return {
            query: intersect(fields, query_fields),
            body: withoutAll(fields, query_fields),
          };
        } else {
          return {
            query: intersect(fields, query_fields),
            body: intersect(fields, body_fields),
          };
        }
      }
    default:
      throw new Error(`Unsupported HTTP verb ${method}`);
  }
};
