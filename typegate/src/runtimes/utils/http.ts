// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

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
  content_type:
    | "application/json"
    | "application/x-www-form-urlencoded"
    | "multipart/form-data";
  query_fields: string[] | null;
  body_fields: string[] | null;
  rename_fields: Record<string, string>;
  auth_token_field: string | null;
  header_prefix: string | null;
}
