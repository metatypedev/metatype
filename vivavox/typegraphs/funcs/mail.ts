// @deno-types="npm:@types/nodemailer"
import nodemailer, { Transporter } from "npm:nodemailer@6.9.16";
import { htmlToText } from "npm:nodemailer-html-to-text@3.2.0";
import { assertStringField } from "./utils.ts";

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface OutgoingMail extends EmailParams {
  from: string;
  reply_to: string;
}

export async function sendEmail(
  params: EmailParams,
  tgSecrets: Record<string, string>,
) {
  const mailSenderAddress = assertStringField(tgSecrets, "MAIL_SENDER_ADDR");
  const mailSenderName = assertStringField(tgSecrets, "MAIL_SENDER_NAME");
  const mailSupportAddr = assertStringField(tgSecrets, "MAIL_SUPPORT_ADDR");
  const mailServiceAddr = assertStringField(tgSecrets, "MAIL_SERVICE_URL");

  const mail = {
    from: `${mailSenderName} <${mailSenderAddress}>`,
    reply_to: mailSupportAddr,
    ...params,
  };

  if (mailServiceAddr.startsWith("smtp")) {
    await sendToSmtp(mail, mailServiceAddr);
  } else {
    const emailitCreds = assertStringField(tgSecrets, "EMAILIT_CREDS");
    await sendToEmailit(mail, mailServiceAddr, emailitCreds);
  }
}

const inbucketTporterCache = {} as Record<string, Transporter>;

async function sendToSmtp(mail: OutgoingMail, smtpAddr: string) {
  let tporter = inbucketTporterCache[smtpAddr];
  if (!tporter) {
    tporter = nodemailer.createTransport(smtpAddr);
    tporter.use("compile", htmlToText());
    inbucketTporterCache[smtpAddr] = tporter;
  }
  return await tporter.sendMail(mail);
}

// FIXME: emailit HTTP based sending doesn't convert html to text
async function sendToEmailit(
  mail: OutgoingMail,
  mailitUrl: string,
  mailitCreds: string,
) {
  const resp = await fetch(mailitUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mailitCreds}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mail),
  });
  if (!resp.ok) {
    console.error("error calling mailit api", resp);
    throw new Error(
      `error calling mailit api ${resp.status} : ${resp.statusText} : ${await resp
        .text()
        .catch((_err) => "error reading body")} `,
    );
  }
}
