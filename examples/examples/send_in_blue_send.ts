interface ISend {
  name: string;
  email: string;
  subject: string;
  message: string;
  apiKey: string;
  from: string;
  to: string;
}

export default async function (
  { name, email, subject, message, apiKey, from, to }: ISend,
) {
  try {
    const req = await fetch(
      "https://api.sendinblue.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          sender: { email: from },
          to: [{ email: to }],
          subject,
          replyTo: { name, email },
          textContent: message,
        }),
      },
    );

    if (req.status === 201) {
      return { success: true };
    }

    const res = await req.json();
    return { success: false, error: res.code };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
