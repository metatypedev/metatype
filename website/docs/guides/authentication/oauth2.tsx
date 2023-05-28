// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import React, { useCallback, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

export default function OAuth2({ name, typegraph }) {
  const {
    siteConfig: {
      customFields: { tgUrl },
    },
  } = useDocusaurusContext();
  const [token, setToken] = useState<string | null>(null);

  const take = useCallback(async () => {
    try {
      const take = await fetch(`${tgUrl}/${typegraph}/auth/take`, {
        credentials: "include",
      });
      const { token } = await take.json();
      setToken(token);
    } catch {
      setToken("not token found");
    }
  }, [setToken, tgUrl]);

  const url = `${tgUrl}/${typegraph}/auth/${name}?redirect_uri=${encodeURIComponent(
    window.location.href
  )}`;
  return (
    <p className="mb-6">
      Start the flow via <a href={url}>{url}</a> and take token by clicking{" "}
      <a onClick={take}>here</a>:<br />
      <input className="px-2 py-1 w-full" value={token ?? ""} />
    </p>
  );
}
