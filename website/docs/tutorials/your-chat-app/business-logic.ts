// skip:start
// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.
// skip:end

import * as emoji from "https://deno.land/x/emoji@0.2.1/mod.ts";

interface ISend {
  title: string;
}

export default async function (
  { title }: ISend,
  { context },
  { gql },
): Promise<boolean> {
  const text = `New message: ${title} from ${context.user.name} ${
    emoji("coffee")
  }`;

  const messageQuery = gql`
    mutation db($title: String!, $user_id: Int!) {
      create_message(data: {title: $title, user_id: $user_id}) {
        id
      }
    }
  `;
  const message = await messageQuery(
    { title: text, user_id: context.user.id },
  );
  console.log(`created message ${message.data.db.create_message.id}`);

  const notifQuery = gql`
    mutation fcm {
      send_notification
    }
  `;
  const notif = await notifQuery();

  console.log(`created notif ${notif.data.fcm.send_notification}`);
  return true;
}
