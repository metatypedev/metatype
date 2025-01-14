// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  Context,
  queryThatTakesAWhile,
  sendSubscriptionEmail,
  sleep,
  Workflow,
} from "../imports/common_types.ts";

import { assertEquals } from "@std/assert";

export const eventsAndExceptionExample: Workflow<string> = async (
  ctx: Context,
) => {
  const { to } = ctx.kwargs;
  const messageDialog = await ctx.save(() => sendSubscriptionEmail(to));
  await ctx.logger.info("Will send to", to);
  await ctx.logger.warn("Will now wait on an event");

  // This will wait until a `confirmation` event is sent to THIS workflow
  const confirmation = ctx.receive<boolean>("confirmation");

  if (!confirmation) {
    await ctx.logger.error("Denial", to);
    throw new Error(`${to} has denied the subscription`);
  }

  return `${messageDialog}: confirmed!`;
};

export async function saveAndSleepExample(ctx: Context) {
  const { a, b } = ctx.kwargs;
  const newA = await ctx.save(() => queryThatTakesAWhile(a as number));
  // + 2s
  const newB = await ctx.save(() => queryThatTakesAWhile(b as number));
  // + 2s

  const sum = await ctx.save(async () => {
    const remoteAdd = new Date().getTime();
    const { data } = await ctx.gql /**/`query { remote_add(a: $a, b: $b) }`.run(
      {
        a: newA,
        b: newB,
      },
    );
    const remoteAddEnd = new Date().getTime();
    console.log(
      "Remote add:",
      (remoteAddEnd - remoteAdd) / 1000,
      ", Response:",
      data,
    );

    return (data as any)?.remote_add as number;
  });

  // +- ~5s
  ctx.sleep(5000);
  return sum;
}

export async function retryExample(ctx: Context) {
  const { fail, timeout } = ctx.kwargs;
  const retryRet = await ctx.save(
    () => {
      if (fail) {
        throw new Error(`Failed successfully`);
      }

      return "No fail";
    },
    {
      retry: {
        strategy: "linear",
        minBackoffMs: 1000,
        maxBackoffMs: 5000,
        maxRetries: 4,
      },
    },
  );

  const timeoutRet = await ctx.save(
    async () => {
      if (timeout) {
        await sleep(500);
      }

      return "No timeout";
    },
    {
      timeoutMs: 200,
      retry: {
        strategy: "linear",
        minBackoffMs: 1000,
        maxBackoffMs: 3000,
        maxRetries: 5,
      },
    },
  );

  return [timeoutRet, retryRet].join(", ");
}

export const secretsExample: Workflow<void> = (_, { secrets }) => {
  const { MY_SECRET, ...rest } = secrets;
  if (!MY_SECRET) {
    throw new Error("unable to read secret");
  }
  if (Object.keys(rest).length > 0) {
    throw new Error("unexpected secrets found: " + JSON.stringify(rest));
  }
  if (MY_SECRET !== "Hello") {
    throw new Error("unexpected secrets valu: " + MY_SECRET + " != Hello");
  }
  return Promise.resolve();
};

export async function accidentalInputMutation(ctx: Context) {
  const { items } = ctx.kwargs;

  const copy = [];

  const mutValue = "MODIFIED";

  while (items.length >= 1) {
    const front = items.shift();

    if (front.innerField == mutValue) {
      // Should throw on shallow clones
      throw new Error(
        `actual kwargs was mutated after interrupts: copy ${
          JSON.stringify(
            copy,
          )
        }, ${mutValue}`,
      );
    }

    copy.push(await ctx.save(() => front));
    console.log("PUSHED", front);

    front!.innerField = mutValue;

    ctx.sleep(10); // force replay
  }

  console.log("FINAL copy", copy);
  return { copy, items };
}

export async function compensation(ctx: Context) {
  const { account } = ctx.kwargs;

  const debitAccount = (value: number) => {
    return account - value;
  };

  const creditAccount = (value: number) => {
    return account + value;
  };

  const risky_transaction = () => {
    throw Error("Transaction Failed");
  };

  await ctx.save(() => debitAccount(4), {
    compensateWith: () => [creditAccount(4), assertEquals(account, 1000)],
  });

  await ctx.save(() => debitAccount(10), {
    compensateWith: () => creditAccount(10),
  });

  await ctx.save(() => {
    debitAccount(2);
    risky_transaction();
  }, {
    compensateWith: () => creditAccount(2),
  });

  await ctx.save(() => debitAccount(100), {
    compensateWith: () => creditAccount(100),
  });
}
