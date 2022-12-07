// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

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

export interface MatOptions extends Record<string, any> {
  content_type: "application/json" | "application/x-www-form-urlencoded";
  query_fields: string[] | null;
  body_fields: string[] | null;
  auth_token_field: string | null;
  header_prefix: string | null;
}
