// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { rpcRequest } from "./client.ts";

const first = rpcRequest("hello", { name: "world" });
const second = rpcRequest("foo");

console.log(JSON.stringify({ first, second }));
