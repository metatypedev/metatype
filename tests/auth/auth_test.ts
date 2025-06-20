// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { assertEquals, assertStringIncludes, assert } from "@std/assert";
import { execute, gql, Meta } from "../utils/mod.ts";

import * as mf from "test/mock_fetch";
// import { nextAuthorizationHeader } from "@metatype/typegate/services/auth/mod.ts";
import { getSetCookies } from "@std/http/cookie";
import { b64decode } from "@metatype/typegate/utils.ts";
import { base64url } from "https://deno.land/x/djwt@v3.0.1/deps.ts";
import { connect, parseURL } from "redis";

const REDIS_URL = "redis://:password@localhost:6380/0";

async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64url.encodeBase64Url(new Uint8Array(digest));
}

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64url.encodeBase64Url(new Uint8Array(array));
}

async function cleanupRedis() {
  const redis = await connect(parseURL(REDIS_URL));
  await redis.flushall();
  redis.close();
}

Meta.test(
  {
    name: "Auth",
    async teardown() {
      await cleanupRedis();
    },
  },
  async (t) => {
    const typegate = t.typegate;
    const crypto = typegate.cryptoKeys;
    const githubClientId = "client_id_1";
    const githubClientSecret = "client_secret_1";

    const appClientId = "test_client";
    const appRedirectUri = "http://localhost:3000";
    const stateString = "state_string";
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const e = await t.engine("auth/auth.py", {
      secrets: {
        GITHUB_CLIENT_ID: githubClientId,
        GITHUB_CLIENT_SECRET: githubClientSecret,
        TEST_CLIENT_ID: appClientId,
        TEST_REDIRECT_URI: appRedirectUri,
      },
    });

    // NOTE: this has to be set manually for the tests
    typegate.redis = await connect(parseURL(REDIS_URL));

    function getCookie(hs: Headers): string | null {
      return getSetCookies(hs)[0]?.value ?? null;
    }

    await t.should("allow public call", async () => {
      await gql`
        query {
          public(x: 1) {
            x
          }
        }
      `
        .expectData({
          public: {
            x: 1,
          },
        })
        .on(e);
    });

    await t.should("disallow unauthentified private call", async () => {
      await gql`
        query {
          private(x: 1) {
            x
          }
        }
      `
        .expectErrorContains("Authorization failed")
        .on(e);
    });

    await t.should("allow authentified private call", async () => {
      await gql`
        query {
          private(x: 1) {
            x
          }
        }
      `
        .withContext({ user1: "zifeo" })
        .expectData({
          private: {
            x: 1,
          },
        })
        .on(e);
    });

    mf.install();

    await t.should("refuse to oauth2 flow without redirect uri", async () => {
      const req = new Request("http://typegate.local/test_auth/auth/github");
      const res = await execute(e, req);
      assertEquals(res.status, 400);
    });

    let nextCookies: string;
    let nextCode: string;
    let nextRefreshToken: string;

    await t.should("redirect to oauth2 flow", async () => {
      const url = new URL("http://typegate.local/test_auth/auth/github");

      url.searchParams.append("client_id", appClientId);
      url.searchParams.append("redirect_uri", appRedirectUri);
      url.searchParams.append("code_challenge", codeChallenge);
      url.searchParams.append("code_challenge_method", "S256");
      url.searchParams.append("state", stateString);

      const req = new Request(url);
      const res = await execute(e, req);
      assertEquals(res.status, 302);
      const redirect = new URL(res.headers.get("location")!);
      assertStringIncludes(
        redirect.href,
        `https://github.com/login/oauth/authorize?response_type=code&client_id=${githubClientId}&redirect_uri=http%3A%2F%2Ftypegate.local%2Ftest_auth%2Fauth%2Fgithub&scope=openid+profile+email&state=`,
      );
      const cookies = getSetCookies(res.headers);
      const loginState = await crypto.decrypt(cookies[0].value);
      const { provider, client } = JSON.parse(loginState);
      assertEquals(appRedirectUri, client.redirectUri);
      assertEquals(provider.state, redirect.searchParams.get("state")!);

      nextCookies = getCookie(res.headers)!;
    });

    await t.should("retrieve oauth2 access and refresh tokens", async () => {
      const code = "abc123";

      const accessToken = "ghu_16C7e42F292c6912E7710c838347Ae178B4a";
      const refreshToken =
        "ghr_1B4a2e77838347a7E420ce178F2E7c6912E169246c34E1ccbF66C46812c06D5B1A9Dc86A1498";
      const id = 2;

      mf.mock("POST@/login/oauth/access_token", async (req) => {
        mf.reset();
        const body = await req.formData();
        const data = Object.fromEntries(body.entries());
        assertEquals(data.code, code);
        const basic = req.headers.get("authorization")!.split(" ")[1];
        assertEquals(
          b64decode(basic),
          `${githubClientId}:${githubClientSecret}`,
        );
        const res = {
          access_token: accessToken,
          expires_in: 28800,
          refresh_token: refreshToken,
          refresh_token_expires_in: 15811200,
          scope: "",
          token_type: "bearer",
        };

        mf.mock("GET@/user", (req) => {
          mf.reset();
          const [type, bearer] = req.headers.get("authorization")!.split(" ");
          assertEquals(type.toLowerCase(), "bearer");
          assertEquals(bearer, accessToken);
          const res = {
            id: id,
          };
          return new Response(JSON.stringify(res), {
            headers: {
              "Content-Type": "application/json",
            },
          });
        });
        return new Response(JSON.stringify(res), {
          headers: {
            "Content-Type": "application/json",
          },
        });
      });

      const decrypted = await crypto.decrypt(nextCookies);
      const { provider } = JSON.parse(decrypted);
      const headers = new Headers();
      headers.set("cookie", `test_auth=${nextCookies}`);
      const req = new Request(
        `http://typegate.local/test_auth/auth/github?code=${code}&state=${provider.state}`,
        { headers },
      );
      const res = await execute(e, req);
      const currentUrl = new URL(res.headers.get("location")!);

      assertEquals(res.status, 302);
      assertEquals(currentUrl.origin, appRedirectUri);

      nextCode = currentUrl.searchParams.get("code")!;
    });

    await t.should("take jwt after oauth2 flow only once", async () => {
      const headers = new Headers();

      headers.set("cookie", `test_auth=${nextCookies}`);

      const req = new Request("http://typegate.local/test_auth/auth/token", {
        headers,
        method: "post",
        body: JSON.stringify({
          code: nextCode,
          code_verifier: codeVerifier,
          client_id: appClientId,
          redirect_uri: appRedirectUri,
          grant_type: "authorization_code",
        }),
      });

      const res = await execute(e, req);
      assertEquals(res.status, 200);
      const takenToken = await res.json();
      assert(takenToken.access_token);
      assert(takenToken.refresh_token);
      assert(takenToken.expires_in);
      assertEquals(takenToken.token_type, "Bearer");
      const cook = getCookie(res.headers);
      assertEquals(cook, "");

      nextRefreshToken = takenToken.refresh_token;
    });

    await t.should("refresh token", async () => {
      const body = JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: nextRefreshToken,
      });
      const req = new Request("http://typegate.local/test_auth/auth/token", {
        method: "post",
        body,
      });

      const res = await execute(e, req);
      assertEquals(res.status, 200);

      const nextReq = new Request(
        "http://typegate.local/test_auth/auth/token",
        {
          method: "post",
          body,
        },
      );

      const nextRes = await execute(e, nextReq);
      assertEquals(nextRes.status, 401);
      assertStringIncludes(await nextRes.text(), "invalid refresh_token");
    });

    await t.should("retrieve oauth2 profile", async () => {
      const token = "very-secret";
      const login = "zifeo";
      const id = 1;

      mf.mock("GET@/user", (req) => {
        mf.reset();
        const bearer = req.headers.get("authorization")!.split(" ")[1];
        assertEquals(bearer, token);
        const res = {
          id: id,
          login: login,
          more: "not-requested",
        };
        return new Response(JSON.stringify(res), {
          headers: {
            "Content-Type": "application/json",
          },
        });
      });

      await gql`
        query {
          user {
            id
            login
          }
        }
      `
        .withContext({ token })
        .expectData({
          user: {
            id,
            login,
          },
        })
        .on(e);
    });

    await t.should("use jwt from header", async () => {
      const jwt = await crypto.signJWT(
        { provider: "internal", user1: "zifeo" },
        10,
      );
      await gql`
        query {
          private(x: 1) {
            x
          }
        }
      `
        .withHeaders({ authorization: `bearer ${jwt}` })
        .expectData({
          private: {
            x: 1,
          },
        })
        .on(e);
    });

    typegate.redis.close();
  },
);
