# skip:start
from typegraph import TypeGraph, effects, t
from typegraph.importers.google_discovery import import_googleapis
from typegraph.runtimes.http import HTTPRuntime

discovery = "https://fcm.googleapis.com/$discovery/rest?version=v1"
import_googleapis(discovery, False)  # set to True to re-import the API

with TypeGraph(
    "fcm",
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    apns_config_in = t.struct(
        {
            "fcmOptions": t.optional(g("ApnsFcmOptionsIn")),
            "headers": t.optional(t.struct({})),
            "payload": t.optional(t.struct({})),
        }
    ).named("ApnsConfigIn")
    apns_config_out = t.struct(
        {
            "fcmOptions": t.optional(g("ApnsFcmOptionsOut")),
            "headers": t.optional(t.struct({})),
            "payload": t.optional(t.struct({})),
        }
    ).named("ApnsConfigOut")

    # skip:end
    # ...
    message_in = t.struct(
        {
            "fcmOptions": t.optional(g("FcmOptionsIn")),
            "notification": t.optional(g("NotificationIn")),
            "topic": t.optional(t.string()),
            "apns": t.optional(g("ApnsConfigIn")),
            "name": t.optional(t.string()),
            "data": t.optional(t.struct({})),
            "webpush": t.optional(g("WebpushConfigIn")),
            "android": t.optional(g("AndroidConfigIn")),
            "condition": t.optional(t.string()),
            "token": t.optional(t.string()),
        }
    ).named("MessageIn")
    # ...
    # skip:start
    message_out = t.struct(
        {
            "fcmOptions": t.optional(g("FcmOptionsOut")),
            "notification": t.optional(g("NotificationOut")),
            "topic": t.optional(t.string()),
            "apns": t.optional(g("ApnsConfigOut")),
            "name": t.optional(t.string()),
            "data": t.optional(t.struct({})),
            "webpush": t.optional(g("WebpushConfigOut")),
            "android": t.optional(g("AndroidConfigOut")),
            "condition": t.optional(t.string()),
            "token": t.optional(t.string()),
        }
    ).named("MessageOut")
    apns_fcm_options_in = t.struct(
        {"analyticsLabel": t.optional(t.string()), "image": t.optional(t.string())}
    ).named("ApnsFcmOptionsIn")
    apns_fcm_options_out = t.struct(
        {"analyticsLabel": t.optional(t.string()), "image": t.optional(t.string())}
    ).named("ApnsFcmOptionsOut")
    fcm_options_in = t.struct({"analyticsLabel": t.optional(t.string())}).named(
        "FcmOptionsIn"
    )
    fcm_options_out = t.struct({"analyticsLabel": t.optional(t.string())}).named(
        "FcmOptionsOut"
    )
    send_message_request_in = t.struct(
        {"message": g("MessageIn"), "validateOnly": t.optional(t.boolean())}
    ).named("SendMessageRequestIn")
    send_message_request_out = t.struct(
        {"message": g("MessageOut"), "validateOnly": t.optional(t.boolean())}
    ).named("SendMessageRequestOut")
    android_notification_in = t.struct(
        {
            "sound": t.optional(t.string()),
            "defaultSound": t.optional(t.boolean()),
            "notificationCount": t.optional(t.integer()),
            "icon": t.optional(t.string()),
            "vibrateTimings": t.optional(t.array(t.string())),
            "localOnly": t.optional(t.boolean()),
            "lightSettings": t.optional(g("LightSettingsIn")),
            "defaultVibrateTimings": t.optional(t.boolean()),
            "color": t.optional(t.string()),
            "title": t.optional(t.string()),
            "bypassProxyNotification": t.optional(t.boolean()),
            "eventTime": t.optional(t.string()),
            "notificationPriority": t.optional(t.string()),
            "bodyLocKey": t.optional(t.string()),
            "clickAction": t.optional(t.string()),
            "bodyLocArgs": t.optional(t.array(t.string())),
            "tag": t.optional(t.string()),
            "body": t.optional(t.string()),
            "image": t.optional(t.string()),
            "titleLocArgs": t.optional(t.array(t.string())),
            "channelId": t.optional(t.string()),
            "sticky": t.optional(t.boolean()),
            "ticker": t.optional(t.string()),
            "titleLocKey": t.optional(t.string()),
            "visibility": t.optional(t.string()),
            "defaultLightSettings": t.optional(t.boolean()),
        }
    ).named("AndroidNotificationIn")
    android_notification_out = t.struct(
        {
            "sound": t.optional(t.string()),
            "defaultSound": t.optional(t.boolean()),
            "notificationCount": t.optional(t.integer()),
            "icon": t.optional(t.string()),
            "vibrateTimings": t.optional(t.array(t.string())),
            "localOnly": t.optional(t.boolean()),
            "lightSettings": t.optional(g("LightSettingsOut")),
            "defaultVibrateTimings": t.optional(t.boolean()),
            "color": t.optional(t.string()),
            "title": t.optional(t.string()),
            "bypassProxyNotification": t.optional(t.boolean()),
            "eventTime": t.optional(t.string()),
            "notificationPriority": t.optional(t.string()),
            "bodyLocKey": t.optional(t.string()),
            "clickAction": t.optional(t.string()),
            "bodyLocArgs": t.optional(t.array(t.string())),
            "tag": t.optional(t.string()),
            "body": t.optional(t.string()),
            "image": t.optional(t.string()),
            "titleLocArgs": t.optional(t.array(t.string())),
            "channelId": t.optional(t.string()),
            "sticky": t.optional(t.boolean()),
            "ticker": t.optional(t.string()),
            "titleLocKey": t.optional(t.string()),
            "visibility": t.optional(t.string()),
            "defaultLightSettings": t.optional(t.boolean()),
        }
    ).named("AndroidNotificationOut")
    android_fcm_options_in = t.struct({"analyticsLabel": t.optional(t.string())}).named(
        "AndroidFcmOptionsIn"
    )
    android_fcm_options_out = t.struct(
        {"analyticsLabel": t.optional(t.string())}
    ).named("AndroidFcmOptionsOut")
    color_in = t.struct(
        {
            "alpha": t.optional(t.float()),
            "red": t.optional(t.float()),
            "green": t.optional(t.float()),
            "blue": t.optional(t.float()),
        }
    ).named("ColorIn")
    color_out = t.struct(
        {
            "alpha": t.optional(t.float()),
            "red": t.optional(t.float()),
            "green": t.optional(t.float()),
            "blue": t.optional(t.float()),
        }
    ).named("ColorOut")
    light_settings_in = t.struct(
        {
            "lightOffDuration": t.string(),
            "lightOnDuration": t.string(),
            "color": g("ColorIn"),
        }
    ).named("LightSettingsIn")
    light_settings_out = t.struct(
        {
            "lightOffDuration": t.string(),
            "lightOnDuration": t.string(),
            "color": g("ColorOut"),
        }
    ).named("LightSettingsOut")
    notification_in = t.struct(
        {
            "image": t.optional(t.string()),
            "body": t.optional(t.string()),
            "title": t.optional(t.string()),
        }
    ).named("NotificationIn")
    notification_out = t.struct(
        {
            "image": t.optional(t.string()),
            "body": t.optional(t.string()),
            "title": t.optional(t.string()),
        }
    ).named("NotificationOut")
    webpush_fcm_options_in = t.struct(
        {"link": t.optional(t.string()), "analyticsLabel": t.optional(t.string())}
    ).named("WebpushFcmOptionsIn")
    webpush_fcm_options_out = t.struct(
        {"link": t.optional(t.string()), "analyticsLabel": t.optional(t.string())}
    ).named("WebpushFcmOptionsOut")
    webpush_config_in = t.struct(
        {
            "fcmOptions": t.optional(g("WebpushFcmOptionsIn")),
            "headers": t.optional(t.struct({})),
            "data": t.optional(t.struct({})),
            "notification": t.optional(t.struct({})),
        }
    ).named("WebpushConfigIn")
    webpush_config_out = t.struct(
        {
            "fcmOptions": t.optional(g("WebpushFcmOptionsOut")),
            "headers": t.optional(t.struct({})),
            "data": t.optional(t.struct({})),
            "notification": t.optional(t.struct({})),
        }
    ).named("WebpushConfigOut")
    android_config_in = t.struct(
        {
            "collapseKey": t.optional(t.string()),
            "restrictedPackageName": t.optional(t.string()),
            "fcmOptions": t.optional(g("AndroidFcmOptionsIn")),
            "priority": t.optional(t.string()),
            "ttl": t.optional(t.string()),
            "directBootOk": t.optional(t.boolean()),
            "notification": t.optional(g("AndroidNotificationIn")),
            "data": t.optional(t.struct({})),
        }
    ).named("AndroidConfigIn")
    android_config_out = t.struct(
        {
            "collapseKey": t.optional(t.string()),
            "restrictedPackageName": t.optional(t.string()),
            "fcmOptions": t.optional(g("AndroidFcmOptionsOut")),
            "priority": t.optional(t.string()),
            "ttl": t.optional(t.string()),
            "directBootOk": t.optional(t.boolean()),
            "notification": t.optional(g("AndroidNotificationOut")),
            "data": t.optional(t.struct({})),
        }
    ).named("AndroidConfigOut")
    googleapis = HTTPRuntime("https://fcm.googleapis.com/")

    projects_messages_send = googleapis.post(
        "/v1/{parent}/messages:send",
        t.struct(
            {
                "parent": t.string(),
                "message": g("MessageIn"),
                "validateOnly": t.optional(t.boolean()),
            }
        ),
        t.either([t.struct({"error": t.any()}), g("MessageOut")]),
        effect=effects.create(),
    ).named("fcm.projects.messages.send")

    g.expose(
        projectsMessagesSend=projects_messages_send,
    )
