// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export const notFound = () =>
  new Response("not found", {
    status: 404,
  });

export const methodNotAllowed = () =>
  new Response("method not allowed", {
    status: 405,
  });
