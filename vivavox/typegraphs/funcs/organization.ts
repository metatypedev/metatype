import {
  AuthTokenPayload,
  CreateOrganizationHandler,
  AcceptInivtationHandler,
  CreateInvitationHandler,
  GraphQLTransport,
  QueryGraph,
  DeclineInvitationHandler,
} from "./fdk.ts";
import { assertStringField, initClient } from "./utils.ts";
import { EmailParams, sendEmail } from "./mail.ts";

export const createOrganization: CreateOrganizationHandler = async (
  params,
  ctx,
) => {
  const { qg, gql } = initClient(ctx.meta.token);

  const { organization } = await gql.mutation({
    organization: qg.createOrganizationInternal(
      { data: { name: params.name, email: params.email } },
      { id: true },
    ),
  });

  await gql.mutation({
    result: qg.addUserToOrganization(
      {
        data: {
          user: { connect: { id: params.adminId } },
          organization: { connect: { id: organization.id } },
          role: "admin",
        },
      },
      { id: true },
    ),
  });

  return organization;
};

export const acceptInvitation: AcceptInivtationHandler = async (
  { invitationId, userId },
  ctx,
) => {
  const client = initClient(ctx.meta.token);
  const { invitation, user } = await findInvitationData(
    client,
    invitationId,
    userId,
  );

  const { result } = await client.gql.mutation({
    result: client.qg.addUserToOrganization(
      {
        data: {
          user: { connect: { id: user.id } },
          organization: { connect: { id: invitation.organization.id } },
          role: invitation.role,
        },
      },
      { id: true },
    ),
    update: client.qg.updateUserInvitation(
      {
        where: { id: invitation.id },
        data: { state: "accepted", updatedAt: new Date().toJSON() },
      },
      { id: true },
    ),
  });

  return result;
};

export const declineInvitation: DeclineInvitationHandler = async (
  { invitationId, userId },
  ctx,
) => {
  const client = initClient(ctx.meta.token);
  const { invitation } = await findInvitationData(client, invitationId, userId);

  const { update } = await client.gql.mutation({
    update: client.qg.updateUserInvitation(
      {
        where: { id: invitation.id },
        data: { state: "declined", updatedAt: new Date().toJSON() },
      },
      { id: true },
    ),
  });

  return { id: update.id };
};

// FIXME: Find a way to make struct type compatible with function output
// @ts-ignore
export const createInvitation: CreateInvitationHandler = async (
  params,
  ctx,
) => {
  const { profile } = ctx.context as AuthTokenPayload;
  if (!profile) {
    throw new Error("profile was not present on auth token");
  }
  const { qg, gql } = initClient(ctx.meta.token);

  const { user, pendingInvitation } = await gql.query({
    user: qg.findUserOrganization(
      {
        where: {
          user: { id: profile.id },
          organization: { id: params.organization },
        },
      },
      { role: true, organization: { id: true, name: true } },
    ),
    pendingInvitation: qg.findUserInvitation(
      {
        where: {
          recipient: params.recipient,
          organization: { id: params.organization },
          state: "pending",
        },
      },
      { id: true },
    ),
  });

  if (!user || user.role != "admin") {
    throw new Error("Unauthorized");
  }

  if (pendingInvitation) {
    throw new Error("The user is already invited");
  }

  const { guest } = await gql.query({
    guest: qg.findUser(
      {
        where: {
          email: params.recipient,
        },
      },
      { id: true },
    ),
  });

  if (guest) {
    const { membership } = await gql.query({
      membership: qg.findUserOrganization(
        {
          where: {
            user: { id: guest.id },
            organization: { id: params.organization },
          },
        },
        { id: true },
      ),
    });

    if (membership) {
      throw new Error("The user is already a member");
    }
  }
  const date = new Date().toJSON();

  const { invitation } = await gql.mutation({
    invitation: qg.createInvitationInternal(
      {
        data: {
          recipient: params.recipient,
          organization: { connect: { id: params.organization } },
          role: params.role,
          createdAt: date,
          updatedAt: date,
          state: "pending",
        },
      },
      { _: "selectAll" },
    ),
  });

  const webAppUrl = assertStringField(ctx.secrets, "VIVAVOX_WEB_URL");
  const invitationUrl = `${webAppUrl}/invitation/${invitation.id}?org=${user.organization.id}`;

  const mail: EmailParams = {
    to: params.recipient,
    subject: `Invitation to join ${user.organization.name} organization on Vivavox`,
    html: `You have been invited to join ${user.organization.name} on Vivavox, use the link below to continue.
<br>
<br>

<a href="${invitationUrl}">Invitation link</a>`,
  };

  await sendEmail(mail, ctx.secrets);

  return invitation;
};

async function findInvitationData(
  client: { qg: QueryGraph; gql: GraphQLTransport },
  invitationId: string,
  userId: string,
) {
  const { user, invitation } = await client.gql.query({
    invitation: client.qg.findInvitation(
      { where: { id: invitationId } },
      { id: true, recipient: true, role: true, organization: { id: true } },
    ),
    user: client.qg.findUser(
      {
        where: { id: userId },
      },
      { id: true, email: true },
    ),
  });

  if (!user) {
    throw new Error("user not found");
  }
  if (!invitation) {
    throw new Error("invitation not found");
  }
  if (user.email !== invitation.recipient) {
    throw new Error("invalid invitation acceptation request");
  }

  return { user, invitation };
}
