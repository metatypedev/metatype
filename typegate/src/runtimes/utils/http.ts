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
