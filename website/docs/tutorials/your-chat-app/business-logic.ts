// skip:start
// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.
// skip:end

import * as emoji from "https://deno.land/x/emoji@0.2.1/mod.ts";

interface ISend {
  title: string;
}

export default async function (
  { title }: ISend,
  { self, context },
): Promise<boolean> {
  const text = `New message: ${title} from ${context.user.name} ${
    emoji("coffee")
  }`;

  const message = await fetch(
    self,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-metatype-key": self, // forward internal key
      },
      body: JSON.stringify({
        query: `
            mutation db($title: String!, $user_id: Int!) {
                create_message(data: {title: $title, user_id: $user_id}) {
            }
            `,
        variables: { title: text, user_id: context.user.id },
      }),
    },
  ).then((r) => r.json());

  console.log(`created message ${message.data.db.create_message.id}`);

  const notif = await fetch(
    self,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-typegate-key": self,
      },
      body: JSON.stringify({
        query: `
            mutation fcm {
                send_notification
            }
            `,
        variables: {},
      }),
    },
  ).then((r) => r.json());

  console.log(`created notif ${notif.data.fcm.send_notification}`);
  return true;
}
