// Copyright Metatype under the Elastic License 2.0.

import { assertEquals, assertStringIncludes } from "std/testing/asserts.ts";
import { execute, gql, sleep, test } from "./utils.ts";

import * as mf from "test/mock_fetch";
import { signJWT, unsafeExtractJWT, verifyJWT } from "../src/crypto.ts";
import { JWTClaims, nextAuthorizationHeader } from "../src/auth.ts";
import { getSetCookies } from "std/http/cookie.ts";
import { b64decode } from "../src/utils.ts";

mf.install();

test("Auth", async (t) => {
  const clientId = "client_id_1";
  const clientSecret = "client_secret_1";
  Deno.env.set("TG_TEST_AUTH_GITHUB_CLIENT_ID", clientId);
  Deno.env.set("TG_TEST_AUTH_GITHUB_CLIENT_SECRET", clientSecret);
  const e = await t.pythonFile("typegraphs/auth.py");
  Deno.env.delete("TG_AUTH_GITHUB_CLIENT_ID");
  Deno.env.delete("TG_AUTH_GITHUB_CLIENT_SECRET");

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
      .expectErrorContains("authorization failed")
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

  await t.should(
    "refuse to oauth2 flow without redirect uri",
    async () => {
      const req = new Request("http://typegate.local/test_auth/auth/github");
      const res = await execute(e, req);
      assertEquals(res.status, 400);
    },
  );

  await t.should(
    "redirect to oauth2 flow",
    async () => {
      const redirectUri = "http://localhost:3000";
      const req = new Request(
        `http://typegate.local/test_auth/auth/github?redirect_uri=${redirectUri}`,
      );
      const res = await execute(e, req);
      assertEquals(res.status, 302);
      const redirect = new URL(res.headers.get("location")!);
      assertStringIncludes(
        redirect.href,
        `https://github.com/login/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=http%3A%2F%2Flocalhost%3A7890%2Ftest_auth%2Fauth%2Fgithub&scope=openid+profile+email&state=`,
      );
      const state = await unsafeExtractJWT(redirect.searchParams.get("state")!);
      assertEquals(state.redirectUri, redirectUri);
    },
  );

  function tokensFromAuthAndCook(hs: Headers): [string | null, string | null] {
    const auth = hs.get(nextAuthorizationHeader)!;
    const cook = getSetCookies(hs)[0]?.value ?? null;
    return [auth, cook];
  }

  await t.should("retrieve oauth2 access and refresh tokens", async () => {
    const code = "abc123";
    const redirectUri = "http://localhost:3000";

    const accessToken = "ghu_16C7e42F292c6912E7710c838347Ae178B4a";
    const refreshToken =
      "ghr_1B4a2e77838347a7E420ce178F2E7c6912E169246c34E1ccbF66C46812d16D5B1A9Dc86A1498";

    mf.mock("POST@/login/oauth/access_token", async (req) => {
      mf.reset();
      const body = await req.formData();
      const data = Object.fromEntries(body.entries());
      assertEquals(data.code, code);
      const basic = req.headers.get("authorization")!.split(" ")[1];
      assertEquals(b64decode(basic), `${clientId}:${clientSecret}`);
      const res = {
        "access_token": accessToken,
        "expires_in": 28800,
        "refresh_token": refreshToken,
        "refresh_token_expires_in": 15811200,
        "scope": "",
        "token_type": "bearer",
      };
      return new Response(JSON.stringify(res), {
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    const state = await signJWT({
      redirectUri,
    }, 10);
    const req = new Request(
      `http://typegate.local/test_auth/auth/github?code=${code}&state=${state}`,
    );
    const res = await execute(e, req);
    assertEquals(res.status, 302);
    assertEquals(res.headers.get("location")!, redirectUri);

    const [auth, cook] = tokensFromAuthAndCook(res.headers);
    assertEquals(auth, cook);

    const claims = await verifyJWT(auth!);
    assertEquals(claims.accessToken, accessToken);
    assertEquals(claims.refreshToken, refreshToken);
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
        "id": id,
        "login": login,
        "more": "not-requested",
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
    const jwt = await signJWT({ user1: "zifeo" }, 10);
    await gql`
        query {
          private(x: 1) {
            x
          }
        }
      `
      .withHeaders({ "authorization": `bearer ${jwt}` })
      .expectData({
        private: {
          x: 1,
        },
      })
      .on(e);
  });

  await t.should("use jwt from cookie", async () => {
    const jwt = await signJWT({ user1: "zifeo" }, 10);
    await gql`
        query {
          private(x: 1) {
            x
          }
        }
      `
      .withHeaders({ "cookie": `test_auth=${jwt}` })
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
    };
    const jwt = await signJWT(claims, 10);
    await gql`
        query {
          token(x: 1) {
            x
          }
        }
      `
      .withHeaders({ "authorization": `bearer ${jwt}` })
      .expect((res) => {
        const [auth, cook] = tokensFromAuthAndCook(res.headers);
        assertEquals(auth, null);
        assertEquals(auth, cook);
      })
      .expectData({
        token: {
          x: 1,
        },
      })
      .on(e);
  });

  await t.should("renew expired oauth2 access token", async () => {
    const claims: JWTClaims = {
      provider: "github",
      accessToken: "a1",
      refreshToken: "r1",
      refreshAt: Math.floor(new Date().valueOf() / 1000),
    };
    const jwt = await signJWT(claims, 10);
    await sleep(1);

    mf.mock("POST@/login/oauth/access_token", async (req) => {
      mf.reset();
      const body = await req.formData();
      const data = Object.fromEntries(body.entries());
      assertEquals(data.refresh_token, "r1");
      const res = {
        "access_token": "a2",
        "expires_in": 28800,
        "refresh_token": "r1",
        "refresh_token_expires_in": 15811200,
        "scope": "",
        "token_type": "bearer",
      };
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
      .withHeaders({ "authorization": `bearer ${jwt}` })
      .expect(async (res) => {
        const [auth, cook] = tokensFromAuthAndCook(res.headers);
        assertEquals(auth, cook);
        const newClaims = await verifyJWT(auth!);
        assertEquals(newClaims.accessToken, "a2");
        assertEquals(newClaims.refreshToken, "r1");
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
    };
    const jwt = await signJWT(claims, 10);
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
      .withHeaders({ "authorization": `bearer ${jwt}` })
      .expect((res) => {
        const [auth, cook] = tokensFromAuthAndCook(res.headers);
        assertEquals(auth, "");
        assertEquals(auth, cook);
      })
      .expectErrorContains("authorization failed")
      .on(e);
  });
});
