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
    color_in = t.struct(
        {"alpha": t.float(), "blue": t.float(), "red": t.float(), "green": t.float()}
    ).named("ColorIn")
    color_out = t.struct(
        {"alpha": t.float(), "blue": t.float(), "red": t.float(), "green": t.float()}
    ).named("ColorOut")
    webpush_fcm_options_in = t.struct(
        {"analyticsLabel": t.string(), "link": t.string()}
    ).named("WebpushFcmOptionsIn")
    webpush_fcm_options_out = t.struct(
        {"analyticsLabel": t.string(), "link": t.string()}
    ).named("WebpushFcmOptionsOut")
    android_fcm_options_in = t.struct({"analyticsLabel": t.string()}).named(
        "AndroidFcmOptionsIn"
    )
    android_fcm_options_out = t.struct({"analyticsLabel": t.string()}).named(
        "AndroidFcmOptionsOut"
    )
    webpush_config_in = t.struct(
        {
            "notification": t.struct({}),
            "data": t.struct({}),
            "fcmOptions": g("WebpushFcmOptionsIn"),
            "headers": t.struct({}),
        }
    ).named("WebpushConfigIn")
    webpush_config_out = t.struct(
        {
            "notification": t.struct({}),
            "data": t.struct({}),
            "fcmOptions": g("WebpushFcmOptionsOut"),
            "headers": t.struct({}),
        }
    ).named("WebpushConfigOut")
    notification_in = t.struct(
        {"title": t.string(), "body": t.string(), "image": t.string()}
    ).named("NotificationIn")
    notification_out = t.struct(
        {"title": t.string(), "body": t.string(), "image": t.string()}
    ).named("NotificationOut")
    apns_config_in = t.struct(
        {
            "fcmOptions": g("ApnsFcmOptionsIn"),
            "headers": t.struct({}),
            "payload": t.struct({}),
        }
    ).named("ApnsConfigIn")
    apns_config_out = t.struct(
        {
            "fcmOptions": g("ApnsFcmOptionsOut"),
            "headers": t.struct({}),
            "payload": t.struct({}),
        }
    ).named("ApnsConfigOut")

    # skip:end
    # ...
    message_in = t.struct(
        {
            "notification": g("NotificationIn"),
            "condition": t.string(),
            "topic": t.string(),
            "data": t.struct({"_": t.optional(t.any())}),
            "android": g("AndroidConfigIn"),
            "token": t.string(),
            "apns": g("ApnsConfigIn"),
            "fcmOptions": g("FcmOptionsIn"),
            "name": t.string(),
            "webpush": g("WebpushConfigIn"),
        }
    ).named("MessageIn")
    # ...
    # skip:start

    message_out = t.struct(
        {
            "webpush": g("WebpushConfigOut"),
            "condition": t.string(),
            "fcmOptions": g("FcmOptionsOut"),
            "android": g("AndroidConfigOut"),
            "apns": g("ApnsConfigOut"),
            "name": t.string(),
            "data": t.struct({}),
            "topic": t.string(),
            "token": t.string(),
            "notification": g("NotificationOut"),
        }
    ).named("MessageOut")
    android_notification_in = t.struct(
        {
            "visibility": t.string(),
            "clickAction": t.string(),
            "title": t.string(),
            "defaultSound": t.boolean(),
            "titleLocKey": t.string(),
            "ticker": t.string(),
            "notificationCount": t.integer(),
            "titleLocArgs": t.array(t.string()),
            "tag": t.string(),
            "defaultVibrateTimings": t.boolean(),
            "notificationPriority": t.string(),
            "channelId": t.string(),
            "sound": t.string(),
            "eventTime": t.string(),
            "bodyLocArgs": t.array(t.string()),
            "image": t.string(),
            "defaultLightSettings": t.boolean(),
            "vibrateTimings": t.array(t.string()),
            "color": t.string(),
            "body": t.string(),
            "localOnly": t.boolean(),
            "bodyLocKey": t.string(),
            "sticky": t.boolean(),
            "lightSettings": g("LightSettingsIn"),
            "icon": t.string(),
            "bypassProxyNotification": t.boolean(),
        }
    ).named("AndroidNotificationIn")
    android_notification_out = t.struct(
        {
            "visibility": t.string(),
            "clickAction": t.string(),
            "title": t.string(),
            "defaultSound": t.boolean(),
            "titleLocKey": t.string(),
            "ticker": t.string(),
            "notificationCount": t.integer(),
            "titleLocArgs": t.array(t.string()),
            "tag": t.string(),
            "defaultVibrateTimings": t.boolean(),
            "notificationPriority": t.string(),
            "channelId": t.string(),
            "sound": t.string(),
            "eventTime": t.string(),
            "bodyLocArgs": t.array(t.string()),
            "image": t.string(),
            "defaultLightSettings": t.boolean(),
            "vibrateTimings": t.array(t.string()),
            "color": t.string(),
            "body": t.string(),
            "localOnly": t.boolean(),
            "bodyLocKey": t.string(),
            "sticky": t.boolean(),
            "lightSettings": g("LightSettingsOut"),
            "icon": t.string(),
            "bypassProxyNotification": t.boolean(),
        }
    ).named("AndroidNotificationOut")
    send_message_request_in = t.struct(
        {"validateOnly": t.boolean(), "message": g("MessageIn")}
    ).named("SendMessageRequestIn")
    send_message_request_out = t.struct(
        {"validateOnly": t.boolean(), "message": g("MessageOut")}
    ).named("SendMessageRequestOut")
    fcm_options_in = t.struct({"analyticsLabel": t.string()}).named("FcmOptionsIn")
    fcm_options_out = t.struct({"analyticsLabel": t.string()}).named("FcmOptionsOut")
    apns_fcm_options_in = t.struct(
        {"analyticsLabel": t.string(), "image": t.string()}
    ).named("ApnsFcmOptionsIn")
    apns_fcm_options_out = t.struct(
        {"analyticsLabel": t.string(), "image": t.string()}
    ).named("ApnsFcmOptionsOut")
    light_settings_in = t.struct(
        {
            "lightOffDuration": t.string(),
            "color": g("ColorIn"),
            "lightOnDuration": t.string(),
        }
    ).named("LightSettingsIn")
    light_settings_out = t.struct(
        {
            "lightOffDuration": t.string(),
            "color": g("ColorOut"),
            "lightOnDuration": t.string(),
        }
    ).named("LightSettingsOut")
    android_config_in = t.struct(
        {
            "priority": t.string(),
            "ttl": t.string(),
            "notification": g("AndroidNotificationIn"),
            "data": t.struct({}),
            "collapseKey": t.string(),
            "directBootOk": t.boolean(),
            "restrictedPackageName": t.string(),
            "fcmOptions": g("AndroidFcmOptionsIn"),
        }
    ).named("AndroidConfigIn")
    android_config_out = t.struct(
        {
            "priority": t.string(),
            "ttl": t.string(),
            "notification": g("AndroidNotificationOut"),
            "data": t.struct({}),
            "collapseKey": t.string(),
            "directBootOk": t.boolean(),
            "restrictedPackageName": t.string(),
            "fcmOptions": g("AndroidFcmOptionsOut"),
        }
    ).named("AndroidConfigOut")
    googleapis = HTTPRuntime("https://fcm.googleapis.com/")

    projects_messages_send = googleapis.post(
        "/v1/{parent}/messages:send",
        t.struct(
            {
                "parent": t.string(),
                "message": g("MessageIn"),
                "validateOnly": t.boolean(),
            }
        ),
        g("MessageOut"),
        effect=effects.create(),
    ).named("fcm.projects.messages.send")

    g.expose(
        projectsMessagesSend=projects_messages_send,
    )
