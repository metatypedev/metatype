import { fx, Policy, t, typegraph } from "@typegraph/sdk";
import { Auth, customProfiler } from "@typegraph/sdk/params";
import { KvRuntime } from "@typegraph/sdk/runtimes/kv";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma";
import { S3Runtime } from "@typegraph/sdk/providers/aws";
import { rack, rootBuilder } from "./utils.js";
import { TypegraphBuilderArgs } from "@typegraph/sdk/typegraph";
import {
  Backend,
  SubstantialRuntime,
  WorkflowFile,
} from "@typegraph/sdk/runtimes/substantial";

const timestamp = () => t.integer();

export default function vivavox(g: TypegraphBuilderArgs) {
  using root = rootBuilder(g);

  // TODO: #819 auto detection of dependencies. No on wants to
  // manually do this work, especially not in the file that
  // contains the business logic
  const tsCommonDeps = ["funcs/utils.ts", "./funcs/fdk.ts"];
  const subsCommonDeps = [...tsCommonDeps, "funcs/types.ts"];

  const substantial_files = [
    WorkflowFile.deno("funcs/response.ts", subsCommonDeps)
      .import(["responseSession"])
      .build(),
    WorkflowFile.deno("funcs/ingress.ts", subsCommonDeps)
      .import(["startIngress"])
      .build(),
  ];

  const rts = {
    deno: new DenoRuntime(),
    kvCache: new KvRuntime("CACHE_REDIS_URL"),
    prisma: new PrismaRuntime("vivavox", "POSTGRES_CONN"),
    // FIXME: the need to provide the substantial_files ahead of time (class ctor
    // instead of function ctor) breaks the style established by the other runtimes.
    sub: new SubstantialRuntime(
      Backend.redis("SUBS_REDIS_URL"),
      substantial_files,
    ),
    s3: new S3Runtime({
      hostSecret: "VIVAVOX_S3_HOST",
      regionSecret: "VIVAVOX_S3_REGION",
      accessKeySecret: "VIVAVOX_S3_ACCESS_KEY",
      secretKeySecret: "VIVAVOX_S3_SECRET_KEY",
      pathStyleSecret: "VIVAVOX_S3_PATH_STYLE",
    }),
  };

  const basicUsers = {
    // key used by the web app
    vivavox_web: "vivavox_web",
    worker: "worker",
  };

  const pol = {
    pub: Policy.public(),
    internal: Policy.internal(),
    vivavoxWebAllowAll: rts.deno.policy(
      "vivavoxWebAllowAll",
      `(_args, { context }) => context.username == "${basicUsers.vivavox_web}" ? 'ALLOW' : 'PASS'`,
    ),
    workerAllowAll: rts.deno.policy(
      "workerAllowAll",
      `(_args, { context }) => context.username == "${basicUsers.worker}" ? 'ALLOW' : 'PASS'`,
    ),
    // WARN: avoid mixing authenticated with above policies,
    // FIXME: PASS/DENY policies don't mix well with ALLOW/PASS policies
    authenticated: rts.deno.policy(
      "authenticated",
      `(_args, cx) => {
          return cx.context.profile ? 'PASS' : 'DENY';
      }`,
    ),
  };

  const emailSecrets = [
    "MAIL_SERVICE_URL",
    "EMAILIT_CREDS",
    "MAIL_SENDER_ADDR",
    "MAIL_SENDER_NAME",
    "MAIL_SUPPORT_ADDR",
  ];

  const commonFields = {
    // FIXME: injected fields are still required by prisma
    // create functions
    // FIXME: applying simple (non-PerEffect) injection eliminates field from Model
    // FIXME: PerEffect injections run into weird permission errors like update being
    // denied for createdAt on a create query
    // FIXME: datetime doesn't expose a orderBy clause in prisma
    createdAt: t.datetime(),
    updatedAt: t.datetime(),
    // TODO: JSONB table mirror for entity tables to collect delted items
    // this should be easily a ts function
  };

  // the main entities of vivavox, each
  // represented by a db table
  const tDomain = rack({
    webSession: t.struct({
      // TODO: #764 uuidv7??
      id: t.uuid({ asId: true, config: { auto: true } }),
      // TODO: use numbers for efficency??
      ipAddr: t.string(),
      userAgent: t.string(),

      user: g.ref("user").optional(),
      // the big token from /auth/take that
      // contains both refresh and accessTokens within
      authToken: t.string().optional(),
      // TODO: connect with oauth2, etc sessions

      expiresAt: t.datetime(),
      ...commonFields,
    }),

    // FIXME: could it be possible to type entt
    // so that we can make sure `g.ref` gets valid names?
    scenario: (/* entt */) =>
      t.struct({
        id: t.uuid({ config: ["auto"] }).id(),
        title: t.string(),
        body: t.string(),
        publishedAt: t.datetime().optional(),
        scenes: t.list(g.ref("scene")),
        links: t.list(g.ref("scenarioLink")),
        author: g.ref("user"),
        organization: g.ref("organization"),
        ...commonFields,
      }),

    scenarioLink: t.struct({
      id: t.uuid({ config: { auto: true } }).id(),
      // TODO: unique index on slug to accelerate lookup
      // we're doing tablescans today
      slug: t.string(),
      slugRecipe: t.json(),
      closedAt: timestamp().optional(),
      scenario: g.ref("scenario"),
      attachedSessions: t.list(g.ref("vivaSession")),
      ...commonFields,
    }),

    // use different counters for different
    // needs. By default, just go for the counter
    // under the key `default`.
    // Only make a separate counter if you need to generate
    // a lot of items for a specific usecase and
    sqidCounters: t.struct({
      key: t.string().id(),
      number: t.integer({}, { config: { default: 0 } }),
    }),

    scene: t.struct(
      {
        id: t.uuid({ asId: true, config: { auto: true } }),
        title: t.string(),
        description: t.string(),
        order: t.integer(),
        video: g.ref("sceneVideo").optional(),
        scenario: g.ref("scenario"),
        responseVideo: t.list(g.ref("responseVideo")),
      },
      { config: { unique: ["scenario", "order"] } },
    ),

    sceneVideo: t.struct({
      id: t.uuid({ asId: true, config: { auto: true } }),
      scene: g.ref("scene"),
      duration: t.float(),
      type: t.string(), // mime type
      width: t.integer(),
      height: t.integer(),
      recordingStartedAt: t.datetime(),
      filePath: t.string().optional(),
      processedFilePath: t.string().optional(),
      transcriptFull: t.json().optional(),
      ...commonFields,
    }),

    vivaSession: t.struct({
      id: t.uuid({ config: { auto: true } }).id(),
      email: t.string({ format: "email" }),
      sourceScenarioLink: g.ref("scenarioLink"),
      specialLinkSlug: t.string(),
      response: g.ref("response").optional(),
      // UTC unix timestamp
      // to get access to comparision
      // operators in prisma
      expiresAtTs: timestamp(),
      ...commonFields,
    }),

    response: t.struct({
      id: t.uuid({ config: { auto: true } }).id(),
      session: g.ref("vivaSession"),
      hiddenAt: t.datetime().optional(),
      videos: t.list(g.ref("responseVideo")),
      ...commonFields,
    }),

    responseVideo: t.struct({
      id: t.uuid({ config: { auto: true } }).id(),
      response: g.ref("response"),
      scene: g.ref("scene"),
      transcript: g.ref("transcript"),
      transcriptFull: t.json().optional(),
      filePath: t.string(),
      recordingStartedAt: t.datetime(),
      ...commonFields,
    }),

    user: t.struct(
      {
        id: t.uuid({ config: { auto: true } }).id(),
        name: t.string(),
        email: t.email().optional(),
        providerName: t.string(),
        providerId: t.string(),
        organizations: t.list(g.ref("userOrganization")),
        scenarios: t.list(g.ref("scenario")),
        webSessions: t.list(g.ref("webSession")),
        // picture: t.uri().optional()
      },
      { config: { unique: ["email", ["providerName", "providerId"]] } },
    ),

    organization: t.struct(
      {
        id: t.uuid({ config: { auto: true } }).id(),
        name: t.string(),
        email: t.email(),
        users: t.list(g.ref("userOrganization")),
        scenarios: t.list(g.ref("scenario")),
        invitations: t.list(g.ref("invitation")),
      },
      {
        config: { unique: ["email"] },
      },
    ),

    userOrganization: t.struct(
      {
        id: t.integer({}, { config: { auto: true } }).id(),
        user: g.ref("user"),
        organization: g.ref("organization"),
        role: g.ref("userRoles"),
      },
      {
        config: { unique: ["user", "organization"] },
      },
    ),

    invitation: t.struct({
      id: t.uuid({ config: { auto: true } }).id(),
      recipient: t.email(),
      organization: g.ref("organization"),
      state: t.enum_(["pending", "accepted", "declined", "canceled"]),
      role: g.ref("userRoles"),
      ...commonFields,
    }),

    transcript: t.struct({
      id: t.uuid({ config: { auto: true } }).id(),
      responseVideo: g.ref("responseVideo").optional(),
      transcriptChunks: t.list(g.ref("transcriptChunk")),
      step: t.integer(),
      room: t.string(),
      // metadata that does not really matter on interviews
      participantId: t.string().optional(),
      participantName: t.string().optional(),
    }),

    transcriptChunk: t.struct({
      id: t.integer({}, { config: { auto: true } }).id(),
      value: t.string(), // !
      createdAt: commonFields.createdAt,
      transcript: g.ref("transcript"),
      // TODO: find a way to retrieve these from livekit
      // To be careful: timeline is relative to the playing video
      // need extra care for the offsets
      // timelineStart: t.integer(),
      // timelineEnd: t.integer()
    }),
  });

  // utility shared types
  // must not be used in prisma
  const tUtil = rack({
    userRoles: t.enum_(["admin", "manager", "reviewer"]),

    sceneMetadata: t.struct({
      title: t.string(),
      description: t.string(),
    }),

    authTokenProfile: t.struct({
      id: t.string().optional(),
      email: t.string().optional(),
    }),
    authTokenPayload: t.struct({
      provider: t.string(),
      accessToken: t.string(),
      refreshToken: t.string(),
      // FIXME: why is this custom claim needed?
      refreshAt: t.integer(),
      scope: t.list(t.string()),
      exp: t.integer(),
      iat: t.integer(),
      profile: g.ref("authTokenProfile").optional(),
    }),
  });

  g.auth(Auth.basic([basicUsers.vivavox_web, basicUsers.worker]));
  g.auth(
    Auth.oauth2Google(
      "profile email openid",
      customProfiler(
        rts.deno.import(
          t.struct({
            // the userid given used the provider
            sub: t.string(),
          }),
          g.ref("authTokenProfile"),
          {
            name: "makeProfiler",
            module: "./funcs/profiler.ts",
            deps: tsCommonDeps,
          },
        ),
      ),
    ),
  );

  const reduce = {
    usersWhereAuth: () => ({
      some: {
        id: g.inherit().fromContext("profile.id"),
      },
    }),
    orgWhereAuth: () => ({
      users: reduce.usersWhereAuth(),
    }),
    scenarioWhereAuth: () => ({
      organization: reduce.orgWhereAuth(),
    }),
    sceneWhereAuth: () => ({
      scenario: reduce.scenarioWhereAuth(),
    }),
    sessionWhereAuth: () => ({
      sourceScenarioLink: {
        scenario: reduce.scenarioWhereAuth(),
      },
    }),
    responseWhereAuth: () => ({
      session: reduce.sessionWhereAuth(),
    }),
  };

  root.expose(
    {
      getContext: rts.deno.func(t.struct({}), t.string(), {
        code: (_, ctx) => JSON.stringify(ctx),
      }),
    },
    pol.pub,
  );

  // we use a seed custom functions so that we don't
  // have to expose the prisma functions (they're internal)
  root.expose(
    {
      seedTest: rts.deno
        .import(t.struct({}), t.boolean(), {
          effect: fx.create(true),
          name: "seedTest",
          module: "./funcs/seeds.ts",
          deps: tsCommonDeps,
        })
        .rename("seedTest")
        .withPolicy(pol.pub),
      createScenariosInternal: rts.prisma.createMany(tDomain.scenario).reduce({
        data: {
          scenes: g.inherit().set(null),
        },
      }),
    },
    pol.internal,
  );

  // endpoints for web sessions
  root.expose(
    {
      createWebSession: rts.prisma.create(tDomain.webSession),
      findWebSession: rts.prisma.findFirst(tDomain.webSession),
      updateWebSession: rts.prisma.update(tDomain.webSession),
      upsertWebSession: rts.prisma.upsert(tDomain.webSession),

      webSessionCacheGet: rts.kvCache.get(),
      webSessionCacheSet: rts.kvCache.set(),
      webSessionCacheDel: rts.kvCache.delete(),
    },
    [pol.vivavoxWebAllowAll],
  );

  // endpoints for viva sessions
  root.expose(
    {
      findVivaSession: rts.prisma.findFirst(tDomain.vivaSession),
      findVivaSessions: rts.prisma.findMany(tDomain.vivaSession),
      createVivaSessionInternal: rts.prisma
        .create(tDomain.vivaSession)
        .withPolicy(pol.internal),
      updateVivaSessionInternal: rts.prisma
        .update(tDomain.vivaSession)
        .withPolicy(pol.internal),
      emailVivaSessionLink: rts.deno
        .import(
          t.struct({
            scenarioId: t.string(),
            address: t.email(),
            linkSlug: t.string(),
          }),
          t.boolean(),
          {
            effect: fx.create(false),
            name: "sendEmailLink",
            module: "./funcs/session.ts",
            deps: [...tsCommonDeps, "./funcs/mail.ts"],
            secrets: [
              "VIVA_SESSION_LIFESPAN_SECS",
              "VIVAVOX_WEB_URL",
              ...emailSecrets,
            ],
          },
        )
        .rename("emailVivaSessionLink"),
    },
    [pol.vivavoxWebAllowAll],
  );

  // endpoints for responses
  {
    root.expose(
      {
        findResponsesService: rts.prisma.findMany(tDomain.response),
      },
      pol.vivavoxWebAllowAll,
    );
    root.expose(
      {
        findResponse: rts.prisma.findFirst(tDomain.response).reduce({
          where: reduce.responseWhereAuth(),
        }),
        findResponses: rts.prisma.findMany(tDomain.response).reduce({
          where: reduce.responseWhereAuth(),
        }),
        hideResponse: rts.prisma.update(tDomain.response).reduce({
          where: reduce.responseWhereAuth(),
          data: {
            hiddenAt: g.inherit().inject("now"),
          },
        }),
      },
      pol.authenticated,
    );
  }

  root.expose(
    {
      createSceneInternal: rts.prisma.create(tDomain.scene),
      aggregateScenesInternal: rts.prisma.aggregate(tDomain.scene).apply({
        where: { scenario: { id: g.asArg("scenarioId") } },
      }),
      // setSceneOrderInternal: rts.prisma.update(tDomain.scene)
      //   .apply({
      //     where: { id: g.asArg("sceneId") },
      //     data: { order: g.asArg("order") }
      //   }),
    },
    pol.internal,
  );

  root.expose(
    {
      publishScenario: rts.deno.import(
        t.struct({
          scenarioId: t.string(),
        }),
        t.struct({
          scenarioId: t.string(),
          slug: t.string(),
          /* scenario: rts.prisma.findFirst(tDomain.scenario).reduce({
              where: {
                id: g.inherit().fromParent("scenarioId"),
              },
            }), */
        }),
        {
          effect: fx.update(true),
          name: "publishScenario",
          module: "./funcs/scenario.ts",
          deps: tsCommonDeps,
        },
      ),
      // createScene: rts.prisma.create(tDomain.scene),
      // deleteScenario: rts.prisma.delete(tDomain.scenario).apply({
      //   where: { id: g.asArg("scenarioId") },
      // }),
      createScene: rts.deno
        .import(
          t.struct({
            scenarioId: t.uuid(),
            scene: tUtil.sceneMetadata,
          }),
          t.struct({
            sceneId: t.uuid(),
            scene: rts.prisma.findUnique(tDomain.scene).reduce({
              where: {
                id: g.inherit().fromParent("sceneId"),
                ...reduce.sceneWhereAuth(),
              },
            }),
          }),
          {
            effect: fx.create(false),
            name: "createScene",
            module: "./funcs/scene.ts",
            deps: tsCommonDeps,
          },
        )
        .rename("createScene"),
      createUser: rts.prisma.create(tDomain.user),
      findUser: rts.prisma.findFirst(tDomain.user),
      // updateScene: rts.deno
      //   .import(tDomain.scene_metadata, t.uuid(), {
      //     effect: fx.create(false),
      //     name: "updateScene",
      //     module: "./funcs/scene.ts",
      //     deps: ["./funcs/mdk.ts", "./funcs/client.ts"],
      //   }),
      // setSceneOrder: rts.deno
      //   .import(t.struct({ sceneId: t.uuid(), order: t.integer() }), t.uuid(), {
      //     effect: fx.create(false),
      //     name: "setSceneOrder",
      //     module: "./funcs/scene.ts",
      //     deps: ["./funcs/mdk.ts", "./funcs/client.ts"],
      //   }),
    },
    [pol.vivavoxWebAllowAll],
  );

  root.expose(
    {
      updateShortLinkInternal: rts.prisma.update(tDomain.scenarioLink),
      updateScenarioInternal: rts.prisma.update(tDomain.scenario),
    },
    [pol.internal],
  );
  {
    root.expose(
      {
        createScenario: rts.prisma.create(tDomain.scenario).reduce({
          data: {
            author: {
              connect: {
                id: g.inherit().fromContext("profile.id"),
              },
            },
            organization: {
              connect: reduce.orgWhereAuth(),
            },
          },
        }),
        // FIXME: this reduce is not being applied for some reason
        deleteScenario: rts.prisma.delete(tDomain.scenario).reduce({
          where: reduce.scenarioWhereAuth(),
        }),
        updateScenario: rts.prisma.update(tDomain.scenario).reduce({
          where: reduce.scenarioWhereAuth(),
        }),
        findScenarios: rts.prisma.findMany(tDomain.scenario).reduce({
          where: reduce.scenarioWhereAuth(),
        }),

        updateScene: rts.prisma.update(tDomain.scene).reduce({
          where: reduce.sceneWhereAuth(),
        }),
        deleteScene: rts.prisma.delete(tDomain.scene).reduce({
          where: reduce.sceneWhereAuth(),
        }),
        findAllScenes: rts.prisma.findMany(tDomain.scene).reduce({
          where: reduce.sceneWhereAuth(),
        }),
      },
      [pol.authenticated],
    );
  }

  root.expose(
    {
      findUserOrganization: rts.prisma.findFirst(tDomain.userOrganization),
      updateUserInvitation: rts.prisma.update(tDomain.invitation),
      findUserInvitation: rts.prisma.findFirst(tDomain.invitation),
      createOrganizationInternal: rts.prisma.create(tDomain.organization),
      createInvitationInternal: rts.prisma.create(tDomain.invitation),
      addUserToOrganization: rts.prisma.create(tDomain.userOrganization),

      acceptInvitation: rts.deno
        .import(
          t.struct({
            invitationId: t.uuid(),
            userId: t.uuid(),
          }),
          t.struct({ id: t.integer() }),
          {
            name: "acceptInvitation",
            module: "./funcs/organization.ts",
            effect: fx.update(false),
            deps: [...tsCommonDeps, "./funcs/mail.ts"],
          },
        )
        .rename("acceptInivtation"),

      declineInvitation: rts.deno
        .import(
          t.struct({
            invitationId: t.uuid(),
            userId: t.uuid(),
          }),
          t.struct({ id: t.string() }),
          {
            name: "declineInvitation",
            module: "./funcs/organization.ts",
            effect: fx.update(false),
            deps: [...tsCommonDeps, "./funcs/mail.ts"],
          },
        )
        .rename("declineInvitation"),
    },
    pol.vivavoxWebAllowAll,
  );

  root.expose(
    {
      createOrganization: rts.deno
        .import(
          t.struct({
            name: t.string(),
            email: t.email(),
            adminId: t.string().fromContext("profile.id"),
          }),
          t.struct({ id: t.string() }),
          {
            name: "createOrganization",
            module: "./funcs/organization.ts",
            deps: [...tsCommonDeps, "./funcs/profiler.ts", "./funcs/mail.ts"],
            effect: fx.create(false),
          },
        )
        .rename("createOrganization"),

      findUserInvitations: rts.prisma.findMany(tDomain.invitation).apply({
        where: {
          recipient: g.fromContext("profile.email"),
          state: g.set("pending"),
        },
      }),

      findOrganization: rts.prisma.findFirst(tDomain.organization).apply({
        where: {
          id: g.asArg("id"),
        },
      }),
    },
    pol.authenticated,
  );

  root.expose(
    {
      findOrganizations: rts.prisma.findMany(tDomain.organization),
      findInvitation: rts.prisma.findFirst(tDomain.invitation),
      updateInvitation: rts.prisma.update(tDomain.invitation),
      updateOrganization: rts.prisma.update(tDomain.organization),
    },
    pol.vivavoxWebAllowAll,
  );

  root.expose(
    {
      createInvitation: rts.deno
        .import(
          t.struct({
            recipient: t.email(),
            organization: t.uuid(),
            role: g.ref("userRoles"),
          }),
          tDomain.invitation,
          {
            name: "createInvitation",
            module: "./funcs/organization.ts",
            effect: fx.update(false),
            deps: [...tsCommonDeps, "./funcs/profiler.ts", "./funcs/mail.ts"],
            secrets: ["VIVAVOX_WEB_URL", ...emailSecrets],
          },
        )
        .rename("createInvitation"),
      // FIXME: these functions need to be secured so that
      // to make sure context user is admin of org

      removeUserFromOrganization: rts.prisma
        .delete(tDomain.userOrganization)
        .apply({ where: { id: g.asArg("id") } }),

      updateUserRole: rts.prisma.update(tDomain.userOrganization).apply({
        where: { id: g.asArg("id") },
        data: { role: g.asArg("role") },
      }),

      findOrganizationInvitations: rts.prisma
        .findMany(tDomain.invitation)
        .apply({
          where: {
            organization: { id: g.asArg("id") },
            state: g.set("pending"),
          },
        }),

      cancelInvitation: rts.prisma.update(tDomain.invitation).apply({
        where: { id: g.asArg("id") },
        data: { state: g.set("canceled"), updatedAt: g.asArg("date") }, // dynamic injection?
      }),
    },
    pol.authenticated,
  );

  // FIXME: better way to change bucket names across targets
  const workingBucket = process.env.VIVAVOX_S3_BUCKET ?? "vivavox";
  // endpoints for scenarios
  root.expose(
    {
      findScenario: rts.prisma.findFirst(tDomain.scenario),
      findScene: rts.prisma.findFirst(tDomain.scene),

      createSceneVideo: rts.prisma.create(tDomain.sceneVideo),
      deleteSceneVideo: rts.prisma.delete(tDomain.sceneVideo),
      updateSceneVideo: rts.prisma.update(tDomain.sceneVideo),

      // endpoint for video files
      // FIXME: parameterize bucket using secret or request?
      // FIXME: these are too generic, we ought to have separate
      // buckets
      signUploadUrl: rts.s3.presignPut({ bucket: workingBucket }),
      getDownloadUrl: rts.s3.presignGet({
        bucket: workingBucket,
        expirySecs: 60 * 60,
      }),
    },
    [pol.vivavoxWebAllowAll],
  );

  root.expose(
    {
      startIngress: rts.sub
        .start(
          t.struct({
            webSessionId: t.string(),
            roomName: t.string(),
            fileName: t.string(),
          }),
          {
            secrets: [
              "LIVEKIT_HOST",
              "LIVEKIT_KEY",
              "LIVEKIT_SECRET",
              "WORKER_REDIS_URL",
            ],
          },
        )
        .reduce({
          name: "startIngress",
        }),
    },
    [pol.vivavoxWebAllowAll],
  );

  // endpoints for responses
  root.expose(
    {
      createResponseInternal: rts.prisma
        .create(tDomain.response)
        .withPolicy(pol.internal),
      createResponse: rts.prisma.create(tDomain.response),
      createResponseVideo: rts.prisma.create(tDomain.responseVideo),

      startResponseSession: rts.sub
        .start(
          t.struct({
            sessionId: t.string(),
            timeoutSec: t.integer().optional(),
          }),
        )
        .reduce({
          name: "responseSession",
        }),

      sendAnswer: rts.sub
        .send(
          t.struct({
            sceneId: t.string(),
            filePath: t.string(),
            transcriptId: t.string(),
            recordingStartedAt: t.datetime(),
          }),
        )
        .reduce({
          event: { name: "answer" },
        }),

      submitResponse: rts.sub.send(t.boolean()).reduce({
        event: { name: "submitResponse" },
      }),

      results: rts.sub.queryResultsRaw().reduce({ name: "responseSession" }),

      abortRun: rts.sub.stop(),
    },
    pol.vivavoxWebAllowAll,
  );

  // transcript util endpoints
  root.expose(
    {
      findTranscriptions: rts.prisma.findMany(tDomain.transcript),
      createTranscript: rts.prisma.create(tDomain.transcript),
      createTranscriptChunk: rts.prisma.create(tDomain.transcriptChunk),
      findTranscriptChunks: rts.prisma.findMany(tDomain.transcriptChunk),
    },
    pol.vivavoxWebAllowAll,
  );

  // internal util endpoints
  root.expose(
    {
      getSqidNumber: rts.prisma.upsert(tDomain.sqidCounters).apply({
        where: {
          // TODO: default values for asArg
          key: g.asArg("key"),
        },
        create: {
          // FIXME: allow injecting multiplle leaf apply leaf nodes
          // from the same arg
          key: g.asArg("key_again"),
          number: g.set(0),
        },
        update: {},
      }),
    },
    [pol.internal],
  );

  // types we want to end up in the typegraph proper
  // but are not used by functions go in this union
  // useful for sharing types across funcs and clients
  const forcedTypes = [tUtil.authTokenPayload];
  root.expose(
    {
      exposeForcedTypes: rts.deno.identity(
        t.struct(
          Object.fromEntries(forcedTypes.map((ty, ii) => [`field${ii}`, ty])),
        ),
      ),
    },
    [pol.internal],
  );
}

const isMainModule = import.meta.url.endsWith(process.argv[1]);
// const isMainModule = import.meta.url === Deno.mainModule;

if (isMainModule) {
  await typegraph(
    {
      name: "vivavox",
      cors: {
        allowOrigin: [
          "https://www-stg.vivavox.io",
          "https://www.vivavox.io",
          "https://studio-stg.vivavox.io",
          "https://studio.vivavox.io",
          "https://www.interviews.top",
          "http://localhost:3000",
          "http://localhost:1234",
          // "http://whisper.vivavox.io", // TODO
        ],
      },
    },
    vivavox,
  );
}
