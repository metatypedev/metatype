import {
  VivaSessionOutput,
  VivaSessionOutputSelections,
  EmailVivaSessionLinkHandler,
} from "./fdk.ts";
import { EmailParams, sendEmail } from "./mail.ts";
import { assertStringField, initClient } from "./utils.ts";

export const sendEmailLink: EmailVivaSessionLinkHandler = async (
  { address, scenarioId, linkSlug },
  cx,
  {},
) => {
  // TODO: secret passing for the module init
  const expiryLifetimeSecs = parseInt(
    assertStringField(cx.secrets, "VIVA_SESSION_LIFESPAN_SECS"),
  );
  if (Number.isNaN(expiryLifetimeSecs)) {
    throw new Error("session lifespan secs is Nan");
  }
  const webAppUrl = assertStringField(cx.secrets, "VIVAVOX_WEB_URL");

  const { qg, gql } = initClient(cx.meta.token);

  const sessionSelection = {
    id: true,
    expiresAtTs: true,
    response: {
      id: true,
    },
    specialLinkSlug: true,
  } satisfies VivaSessionOutputSelections;

  const { scenario, oldSessions } = await gql.query({
    // FIXME: find a way to express findFirst return objects might be null
    // or hack it into metagen
    scenario: qg.findScenario(
      {
        where: { id: scenarioId, links: { some: { slug: linkSlug } } },
      },
      {
        id: true,
        title: true,
        body: true,
        links: { slug: true, id: true, closedAt: true },
        organization: {
          name: true,
        },
      },
    ),
    oldSessions: qg.findVivaSessions(
      {
        where: {
          email: address,
          sourceScenarioLink: {
            scenario: {
              id: scenarioId,
            },
          },
        },
        orderBy: [
          {
            createdAt: "asc",
          },
        ],
      },
      sessionSelection,
    ),
  });
  if (!scenario) {
    throw new Error("scenario not found");
  }

  if (scenario.links.find((link) => link.slug == linkSlug)?.closedAt) {
    throw new Error("scenario link is closed");
  }

  let session: VivaSessionOutput | undefined;

  const activeSession = oldSessions.find(
    // if it's not expired
    // or it already has a response
    (ses) => ses.response || new Date().getTime() / 1000 > ses.expiresAtTs,
  );
  if (activeSession) {
    // increase the expiry ts and send the same link in the email
    await gql.mutation({
      update: qg.updateVivaSessionInternal(
        {
          where: {
            id: activeSession.id,
          },
          data: {
            expiresAtTs: {
              set: Math.ceil(new Date().getTime() / 1000 + expiryLifetimeSecs),
            },
            updatedAt: new Date().toJSON(),
          },
        },
        {
          id: true,
        },
      ),
    });
    session = activeSession;
  } else {
    // TODO: consider using jwt here
    const specialLinkSlug = crypto.randomUUID();

    // create a new link
    const { newSession } = await gql.mutation({
      newSession: qg.createVivaSessionInternal(
        {
          data: {
            email: address,
            expiresAtTs: Math.ceil(
              new Date().getTime() / 1000 + expiryLifetimeSecs,
            ),
            sourceScenarioLink: {
              connect: {
                id: scenario.links.find((link) => link.slug == linkSlug)?.id,
              },
            },
            specialLinkSlug,
            createdAt: new Date().toJSON(),
            updatedAt: new Date().toJSON(),
          },
        },
        sessionSelection,
      ),
    });
    session = newSession;
  }

  const interviewLink = `${webAppUrl}/s/${linkSlug}?t=${session.specialLinkSlug}`;
  /* const scenarioLink = `${webAppUrl}/v/${scenario.id}`;
  const codePageLink = `${webAppUrl}/code`; */

  const emailParams: EmailParams = {
    to: address,
    subject: `Vivavox interview link | From ${scenario.organization.name}`,
    html: `Here &apos;s your special link to access the interview for <strong>${scenario.title}</strong>.
<br>
<br>

<a href="${interviewLink}">LINK</a>

<br>
<br>
This link will expire in ${Math.floor(expiryLifetimeSecs / 60 / 60)} hours.
`,
  };

  await sendEmail(emailParams, cx.secrets);

  return true;
};
