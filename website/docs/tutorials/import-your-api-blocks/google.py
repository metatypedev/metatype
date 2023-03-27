# skip:start
from typegraph import TypeGraph, t
from typegraph.importers.google_discovery import import_googleapis
from typegraph.runtimes.http import HTTPRuntime

discovery = "https://fcm.googleapis.com/$discovery/rest?version=v1"
import_googleapis(discovery, False)  # set to True to re-import the API

with TypeGraph(
    "fcm-google",
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    apns_fcm_options_in = t.struct(
        {"image": t.optional(t.string()), "analyticsLabel": t.optional(t.string())}
    ).named("ApnsFcmOptionsIn")
    apns_fcm_options_out = t.struct(
        {"image": t.optional(t.string()), "analyticsLabel": t.optional(t.string())}
    ).named("ApnsFcmOptionsOut")
    android_fcm_options_in = t.struct({"analyticsLabel": t.optional(t.string())}).named(
        "AndroidFcmOptionsIn"
    )
    android_fcm_options_out = t.struct(
        {"analyticsLabel": t.optional(t.string())}
    ).named("AndroidFcmOptionsOut")
    android_config_in = t.struct(
        {
            "collapseKey": t.optional(t.string()),
            "restrictedPackageName": t.optional(t.string()),
            "directBootOk": t.optional(t.boolean()),
            "notification": t.optional(g("AndroidNotificationIn")),
            "ttl": t.optional(t.string()),
            "priority": t.optional(t.string()),
            "fcmOptions": t.optional(g("AndroidFcmOptionsIn")),
            "data": t.optional(t.struct({})),
        }
    ).named("AndroidConfigIn")
    android_config_out = t.struct(
        {
            "collapseKey": t.optional(t.string()),
            "restrictedPackageName": t.optional(t.string()),
            "directBootOk": t.optional(t.boolean()),
            "notification": t.optional(g("AndroidNotificationOut")),
            "ttl": t.optional(t.string()),
            "priority": t.optional(t.string()),
            "fcmOptions": t.optional(g("AndroidFcmOptionsOut")),
            "data": t.optional(t.struct({})),
        }
    ).named("AndroidConfigOut")
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
    webpush_config_in = t.struct(
        {
            "notification": t.optional(t.struct({})),
            "headers": t.optional(t.struct({})),
            "fcmOptions": t.optional(g("WebpushFcmOptionsIn")),
            "data": t.optional(t.struct({})),
        }
    ).named("WebpushConfigIn")
    webpush_config_out = t.struct(
        {
            "notification": t.optional(t.struct({})),
            "headers": t.optional(t.struct({})),
            "fcmOptions": t.optional(g("WebpushFcmOptionsOut")),
            "data": t.optional(t.struct({})),
        }
    ).named("WebpushConfigOut")
    send_message_request_in = t.struct(
        {"message": g("MessageIn"), "validateOnly": t.optional(t.boolean())}
    ).named("SendMessageRequestIn")
    send_message_request_out = t.struct(
        {"message": g("MessageOut"), "validateOnly": t.optional(t.boolean())}
    ).named("SendMessageRequestOut")
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
    fcm_options_in = t.struct({"analyticsLabel": t.optional(t.string())}).named(
        "FcmOptionsIn"
    )
    fcm_options_out = t.struct({"analyticsLabel": t.optional(t.string())}).named(
        "FcmOptionsOut"
    )
    color_in = t.struct(
        {
            "green": t.optional(t.float()),
            "blue": t.optional(t.float()),
            "alpha": t.optional(t.float()),
            "red": t.optional(t.float()),
        }
    ).named("ColorIn")
    color_out = t.struct(
        {
            "green": t.optional(t.float()),
            "blue": t.optional(t.float()),
            "alpha": t.optional(t.float()),
            "red": t.optional(t.float()),
        }
    ).named("ColorOut")
    webpush_fcm_options_in = t.struct(
        {"link": t.optional(t.string()), "analyticsLabel": t.optional(t.string())}
    ).named("WebpushFcmOptionsIn")
    webpush_fcm_options_out = t.struct(
        {"link": t.optional(t.string()), "analyticsLabel": t.optional(t.string())}
    ).named("WebpushFcmOptionsOut")
    # skip:end
    # ...
    message_in = t.struct(
        {
            "fcmOptions": t.optional(g("FcmOptionsIn")),
            "condition": t.optional(t.string()),
            "name": t.optional(t.string()),
            "topic": t.optional(t.string()),
            "android": t.optional(g("AndroidConfigIn")),
            "notification": t.optional(g("NotificationIn")),
            "webpush": t.optional(g("WebpushConfigIn")),
            "token": t.optional(t.string()),
            "data": t.optional(t.struct({})),
            "apns": t.optional(g("ApnsConfigIn")),
        }
    ).named("MessageIn")
    # ...
    # skip:start
    message_out = t.struct(
        {
            "fcmOptions": t.optional(g("FcmOptionsOut")),
            "condition": t.optional(t.string()),
            "name": t.optional(t.string()),
            "topic": t.optional(t.string()),
            "android": t.optional(g("AndroidConfigOut")),
            "notification": t.optional(g("NotificationOut")),
            "webpush": t.optional(g("WebpushConfigOut")),
            "token": t.optional(t.string()),
            "data": t.optional(t.struct({})),
            "apns": t.optional(g("ApnsConfigOut")),
        }
    ).named("MessageOut")
    android_notification_in = t.struct(
        {
            "title": t.optional(t.string()),
            "image": t.optional(t.string()),
            "visibility": t.optional(t.string()),
            "defaultSound": t.optional(t.boolean()),
            "notificationCount": t.optional(t.integer()),
            "notificationPriority": t.optional(t.string()),
            "defaultVibrateTimings": t.optional(t.boolean()),
            "vibrateTimings": t.optional(t.array(t.string())),
            "localOnly": t.optional(t.boolean()),
            "bodyLocKey": t.optional(t.string()),
            "bypassProxyNotification": t.optional(t.boolean()),
            "icon": t.optional(t.string()),
            "titleLocKey": t.optional(t.string()),
            "body": t.optional(t.string()),
            "sticky": t.optional(t.boolean()),
            "titleLocArgs": t.optional(t.array(t.string())),
            "channelId": t.optional(t.string()),
            "bodyLocArgs": t.optional(t.array(t.string())),
            "clickAction": t.optional(t.string()),
            "ticker": t.optional(t.string()),
            "eventTime": t.optional(t.string()),
            "sound": t.optional(t.string()),
            "color": t.optional(t.string()),
            "tag": t.optional(t.string()),
            "defaultLightSettings": t.optional(t.boolean()),
            "lightSettings": t.optional(g("LightSettingsIn")),
        }
    ).named("AndroidNotificationIn")
    android_notification_out = t.struct(
        {
            "title": t.optional(t.string()),
            "image": t.optional(t.string()),
            "visibility": t.optional(t.string()),
            "defaultSound": t.optional(t.boolean()),
            "notificationCount": t.optional(t.integer()),
            "notificationPriority": t.optional(t.string()),
            "defaultVibrateTimings": t.optional(t.boolean()),
            "vibrateTimings": t.optional(t.array(t.string())),
            "localOnly": t.optional(t.boolean()),
            "bodyLocKey": t.optional(t.string()),
            "bypassProxyNotification": t.optional(t.boolean()),
            "icon": t.optional(t.string()),
            "titleLocKey": t.optional(t.string()),
            "body": t.optional(t.string()),
            "sticky": t.optional(t.boolean()),
            "titleLocArgs": t.optional(t.array(t.string())),
            "channelId": t.optional(t.string()),
            "bodyLocArgs": t.optional(t.array(t.string())),
            "clickAction": t.optional(t.string()),
            "ticker": t.optional(t.string()),
            "eventTime": t.optional(t.string()),
            "sound": t.optional(t.string()),
            "color": t.optional(t.string()),
            "tag": t.optional(t.string()),
            "defaultLightSettings": t.optional(t.boolean()),
            "lightSettings": t.optional(g("LightSettingsOut")),
        }
    ).named("AndroidNotificationOut")
    apns_config_in = t.struct(
        {
            "headers": t.optional(t.struct({})),
            "payload": t.optional(t.struct({})),
            "fcmOptions": t.optional(g("ApnsFcmOptionsIn")),
        }
    ).named("ApnsConfigIn")
    apns_config_out = t.struct(
        {
            "headers": t.optional(t.struct({})),
            "payload": t.optional(t.struct({})),
            "fcmOptions": t.optional(g("ApnsFcmOptionsOut")),
        }
    ).named("ApnsConfigOut")

    remote = HTTPRuntime("https://fcm.googleapis.com/")
    projects_messages_send = remote.post(
        "v1/{parent}/messages:send",
        t.struct(
            {
                "parent": t.string(),
                "validateOnly": t.optional(t.boolean()),
                "message": g("MessageIn"),
                "header_authorization": t.string(),
            }
        ),
        # t.struct({"name": t.string()}),
        # g("MessageOut"),
        t.struct(
            {
                "error": t.struct(
                    {"code": t.integer(), "message": t.string(), "status": t.string()}
                )
            }
        ),
        content_type="application/json",
    ).named("fcm.projects.messages.send")
    g.expose(projectsMessagesSend=projects_messages_send)
