import { getCookies } from "std/http/cookie.ts";
import * as base64 from "std/encoding/base64.ts";
import { Engine } from "../engine.ts";
import { OAuth2Auth } from "../auth.ts";

export const renderDebugAuth = async (
  engine: Engine,
  request: Request,
): Promise<string> => {
  const name = engine.tg.root.name;
  const typegraphApi = `http://localhost:7890/${name}`;
  const cookies = getCookies(request.headers);
  const jwt = (cookies[name] ?? "").split(".")[1];
  const claims = jwt
    ? JSON.parse(new TextDecoder().decode(base64.decode(jwt)))
    : {};
  const provider = engine.tg.auths.get(claims.provider);
  const profile = provider && provider.authDS.protocol === "oauth2"
    ? await (provider as OAuth2Auth).getProfile(claims.accessToken)
    : {};
  return `
    <a href="${typegraphApi}/auth/github?redirect_uri=${typegraphApi}/auth">Github</a><br />
    <a href="${typegraphApi}/auth/github?redirect_uri=${typegraphApi}/auth?clear">Clear jwt</a><br />
    <a href="" onclick="clearCookies();">Clear cookies</a><br /><br />
    Timestamp: <pre>${new Date().valueOf() / 1000}</pre>
    Cookies: <pre>${JSON.stringify(cookies, null, 2)}</pre>
    Claims: <pre>${JSON.stringify(claims, null, 2)}</pre>
    Profile: <pre>${JSON.stringify(profile, null, 2)}</pre>
    <script>
        function clearCookies() {
            let cookies = document.cookie.split(";");
            for (let i = 0; i < cookies.length; i += 1) {
                var cookie = cookies[i];
                console.log(cookie)
                var idx = cookie.indexOf("=");
                var name = idx > -1 ? cookie.substr(0, idx): cookie;
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
            }
        }
    </script>
  `;
};
