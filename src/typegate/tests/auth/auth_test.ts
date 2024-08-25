// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assertEquals, assertStringIncludes } from "std/assert/mod.ts";
import { execute, gql, Meta, sleep } from "../utils/mod.ts";

import * as mf from "test/mock_fetch";
import { randomUUID } from "../../src/crypto.ts";
import { nextAuthorizationHeader } from "../../src/services/auth/mod.ts";
import { JWTClaims } from "../../src/services/auth/mod.ts";
import { getSetCookies } from "std/http/cookie.ts";
import { b64decode } from "../../src/utils.ts";

Meta.test("Auth", async (t) => {
  const typegate = t.typegate;
  const crypto = typegate.cryptoKeys;
  const clientId = "client_id_1";
  const clientSecret = "client_secret_1";
  const e = await t.engine("auth/auth.py", {
    secrets: {
      GITHUB_CLIENT_ID: clientId,
      GITHUB_CLIENT_SECRET: clientSecret,
    },
  });

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

  await t.should("redirect to oauth2 flow", async () => {
    const redirectUri = "http://localhost:3000";
    const req = new Request(
      `http://typegate.local/test_auth/auth/github?redirect_uri=${redirectUri}`,
    );
    const res = await execute(e, req);
    assertEquals(res.status, 302);
    const redirect = new URL(res.headers.get("location")!);
    assertStringIncludes(
      redirect.href,
      `https://github.com/login/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=http%3A%2F%2Ftypegate.local%2Ftest_auth%2Fauth%2Fgithub&scope=openid+profile+email&state=`,
    );
    const cookies = getSetCookies(res.headers);
    const loginState = await crypto.decrypt(cookies[0].value);
    const { state, userRedirectUri } = JSON.parse(loginState);
    assertEquals(state, redirect.searchParams.get("state")!);
    assertEquals(redirectUri, userRedirectUri);
  });

  function getCookie(hs: Headers): string | null {
    return getSetCookies(hs)[0]?.value ?? null;
  }

  await t.should("retrieve oauth2 access and refresh tokens", async () => {
    const code = "abc123";
    const userRedirectUri = "http://localhost:3000";

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
      assertEquals(b64decode(basic), `${clientId}:${clientSecret}`);
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

    const state = randomUUID();
    const cookie = await crypto.encrypt(
      JSON.stringify({
        userRedirectUri,
        state,
      }),
    );
    const headers = new Headers();
    headers.set("cookie", `test_auth=${cookie}`);
    const req = new Request(
      `http://typegate.local/test_auth/auth/github?code=${code}&state=${state}`,
      { headers },
    );
    const res = await execute(e, req);
    assertEquals(res.status, 302);
    assertEquals(res.headers.get("location")!, userRedirectUri);

    const cook = getCookie(res.headers);

    const { token } = JSON.parse(await crypto.decrypt(cook!));
    const claims = (await crypto.verifyJWT(token)) as JWTClaims;
    assertEquals(claims.accessToken, accessToken);
    assertEquals(claims.profile?.id, id);
    assertEquals(
      await crypto.decrypt(claims.refreshToken as string),
      refreshToken,
    );
  });

  await t.should("take jwt after oauth2 flow only once", async () => {
    const headers = new Headers();
    const token = "very-secret";
    const redirectUri = "http://localhost:3000";
    const cookie = await crypto.encrypt(JSON.stringify({ token, redirectUri }));
    headers.set("cookie", `test_auth=${cookie}`);
    const req = new Request(`http://typegate.local/test_auth/auth/take`, {
      headers,
    });
    const res = await execute(e, req);
    assertEquals(res.status, 200);
    const { token: takenToken } = await res.json();
    assertEquals(takenToken, token);
    const cook = getCookie(res.headers);
    assertEquals(cook, "");
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

  await t.should("not renew valid oauth2 access token", async () => {
    const claims: JWTClaims = {
      provider: "github",
      accessToken: "a1",
      refreshToken: "r1",
      refreshAt: new Date().valueOf() + 10,
      profile: { id: 123 },
    };
    const jwt = await crypto.signJWT(claims, 10);
    await gql`
      query {
        token(x: 1) {
          x
        }
      }
    `
      .withHeaders({ authorization: `bearer ${jwt}` })
      .expect((res) => {
        const cook = getCookie(res.headers);
        assertEquals(cook, null);
      })
      .expectData({
        token: {
          x: 1,
        },
      })
      .on(e);
  });

  await t.should("renew expired oauth2 access token", async () => {
    const refreshToken = await crypto.encrypt("r1");
    const claims: JWTClaims = {
      provider: "github",
      accessToken: "a1",
      refreshToken,
      refreshAt: Math.floor(new Date().valueOf() / 1000),
      profile: { id: 123 },
    };
    const jwt = await crypto.signJWT(claims, 10);
    await sleep(1);
    const id = 1;

    mf.mock("POST@/login/oauth/access_token", async (req) => {
      mf.reset();
      const body = await req.formData();
      const data = Object.fromEntries(body.entries());
      assertEquals(await crypto.decrypt(data.refresh_token as string), "r1");
      const res = {
        access_token: "a2",
        expires_in: 28800,
        refresh_token: "r1",
        refresh_token_expires_in: 15811200,
        scope: "",
        token_type: "bearer",
      };

      mf.mock("GET@/user", () => {
        mf.reset();
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

    await gql`
      query {
        token(x: 1) {
          x
        }
      }
    `
      .withHeaders({ authorization: `bearer ${jwt}` })
      .expect(async (res) => {
        const header = res.headers.get(nextAuthorizationHeader);
        const newClaims = await crypto.verifyJWT(header!);
        assertEquals(newClaims.accessToken, "a2");
        assertEquals(
          await crypto.decrypt(newClaims.refreshToken as string),
          "r1",
        );
      })
      .expectData({
        token: {
          x: 1,
        },
      })
      .on(e);
  });

  await t.should("remove invalid oauth2 access token", async () => {
    const claims: JWTClaims = {
      provider: "github",
      accessToken: "a1",
      refreshToken: "r1",
      refreshAt: Math.floor(new Date().valueOf() / 1000),
      profile: { id: 123 },
    };
    const jwt = await crypto.signJWT(claims, 10);
    await sleep(1);

    mf.mock("POST@/login/oauth/access_token", () => {
      mf.reset();
      return new Response(null, {
        status: 401,
      });
    });

    await gql`
      query {
        token(x: 1) {
          x
        }
      }
    `
      .withHeaders({ authorization: `bearer ${jwt}` })
      .expect((res) => {
        const header = res.headers.get(nextAuthorizationHeader);
        assertEquals(header, "");
      })
      .expectErrorContains("Authorization failed")
      .on(e);
  });
});
