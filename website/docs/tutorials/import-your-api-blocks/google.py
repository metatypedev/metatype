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
    error_response = t.struct(
        {"code": t.integer(), "message": t.string(), "status": t.string()}
    ).named("ErrorResponse")
    android_fcm_options_in = t.struct({"analyticsLabel": t.optional(t.string())}).named(
        "AndroidFcmOptionsIn"
    )
    android_fcm_options_out = t.struct(
        {
            "analyticsLabel": t.optional(t.string()),
            "error": t.optional(g("ErrorResponse")),
        }
    ).named("AndroidFcmOptionsOut")
    webpush_fcm_options_in = t.struct(
        {"analyticsLabel": t.optional(t.string()), "link": t.optional(t.string())}
    ).named("WebpushFcmOptionsIn")
    webpush_fcm_options_out = t.struct(
        {
            "analyticsLabel": t.optional(t.string()),
            "link": t.optional(t.string()),
            "error": t.optional(g("ErrorResponse")),
        }
    ).named("WebpushFcmOptionsOut")
    apns_config_in = t.struct(
        {
            "fcmOptions": t.optional(g("ApnsFcmOptionsIn")),
            "payload": t.optional(t.struct({})),
            "headers": t.optional(t.struct({})),
        }
    ).named("ApnsConfigIn")
    apns_config_out = t.struct(
        {
            "fcmOptions": t.optional(g("ApnsFcmOptionsOut")),
            "payload": t.optional(t.struct({})),
            "headers": t.optional(t.struct({})),
            "error": t.optional(g("ErrorResponse")),
        }
    ).named("ApnsConfigOut")
    send_message_request_in = t.struct(
        {"validateOnly": t.optional(t.boolean()), "message": g("MessageIn")}
    ).named("SendMessageRequestIn")
    send_message_request_out = t.struct(
        {
            "validateOnly": t.optional(t.boolean()),
            "message": g("MessageOut"),
            "error": t.optional(g("ErrorResponse")),
        }
    ).named("SendMessageRequestOut")
    android_config_in = t.struct(
        {
            "collapseKey": t.optional(t.string()),
            "fcmOptions": t.optional(g("AndroidFcmOptionsIn")),
            "notification": t.optional(g("AndroidNotificationIn")),
            "directBootOk": t.optional(t.boolean()),
            "ttl": t.optional(t.string()),
            "priority": t.optional(t.string()),
            "restrictedPackageName": t.optional(t.string()),
            "data": t.optional(t.struct({})),
        }
    ).named("AndroidConfigIn")
    android_config_out = t.struct(
        {
            "collapseKey": t.optional(t.string()),
            "fcmOptions": t.optional(g("AndroidFcmOptionsOut")),
            "notification": t.optional(g("AndroidNotificationOut")),
            "directBootOk": t.optional(t.boolean()),
            "ttl": t.optional(t.string()),
            "priority": t.optional(t.string()),
            "restrictedPackageName": t.optional(t.string()),
            "data": t.optional(t.struct({})),
            "error": t.optional(g("ErrorResponse")),
        }
    ).named("AndroidConfigOut")
    color_in = t.struct(
        {
            "blue": t.optional(t.float()),
            "alpha": t.optional(t.float()),
            "red": t.optional(t.float()),
            "green": t.optional(t.float()),
        }
    ).named("ColorIn")
    color_out = t.struct(
        {
            "blue": t.optional(t.float()),
            "alpha": t.optional(t.float()),
            "red": t.optional(t.float()),
            "green": t.optional(t.float()),
            "error": t.optional(g("ErrorResponse")),
        }
    ).named("ColorOut")
    notification_in = t.struct(
        {
            "body": t.optional(t.string()),
            "image": t.optional(t.string()),
            "title": t.optional(t.string()),
        }
    ).named("NotificationIn")
    notification_out = t.struct(
        {
            "body": t.optional(t.string()),
            "image": t.optional(t.string()),
            "title": t.optional(t.string()),
            "error": t.optional(g("ErrorResponse")),
        }
    ).named("NotificationOut")
    apns_fcm_options_in = t.struct(
        {"image": t.optional(t.string()), "analyticsLabel": t.optional(t.string())}
    ).named("ApnsFcmOptionsIn")
    apns_fcm_options_out = t.struct(
        {
            "image": t.optional(t.string()),
            "analyticsLabel": t.optional(t.string()),
            "error": t.optional(g("ErrorResponse")),
        }
    ).named("ApnsFcmOptionsOut")
    fcm_options_in = t.struct({"analyticsLabel": t.optional(t.string())}).named(
        "FcmOptionsIn"
    )
    fcm_options_out = t.struct(
        {
            "analyticsLabel": t.optional(t.string()),
            "error": t.optional(g("ErrorResponse")),
        }
    ).named("FcmOptionsOut")
    android_notification_in = t.struct(
        {
            "color": t.optional(t.string()),
            "notificationPriority": t.optional(t.string()),
            "image": t.optional(t.string()),
            "titleLocArgs": t.optional(t.array(t.string())),
            "sticky": t.optional(t.boolean()),
            "notificationCount": t.optional(t.integer()),
            "vibrateTimings": t.optional(t.array(t.string())),
            "defaultLightSettings": t.optional(t.boolean()),
            "body": t.optional(t.string()),
            "bodyLocKey": t.optional(t.string()),
            "sound": t.optional(t.string()),
            "localOnly": t.optional(t.boolean()),
            "bypassProxyNotification": t.optional(t.boolean()),
            "ticker": t.optional(t.string()),
            "eventTime": t.optional(t.string()),
            "defaultSound": t.optional(t.boolean()),
            "tag": t.optional(t.string()),
            "clickAction": t.optional(t.string()),
            "bodyLocArgs": t.optional(t.array(t.string())),
            "titleLocKey": t.optional(t.string()),
            "lightSettings": t.optional(g("LightSettingsIn")),
            "defaultVibrateTimings": t.optional(t.boolean()),
            "visibility": t.optional(t.string()),
            "title": t.optional(t.string()),
            "icon": t.optional(t.string()),
            "channelId": t.optional(t.string()),
        }
    ).named("AndroidNotificationIn")
    android_notification_out = t.struct(
        {
            "color": t.optional(t.string()),
            "notificationPriority": t.optional(t.string()),
            "image": t.optional(t.string()),
            "titleLocArgs": t.optional(t.array(t.string())),
            "sticky": t.optional(t.boolean()),
            "notificationCount": t.optional(t.integer()),
            "vibrateTimings": t.optional(t.array(t.string())),
            "defaultLightSettings": t.optional(t.boolean()),
            "body": t.optional(t.string()),
            "bodyLocKey": t.optional(t.string()),
            "sound": t.optional(t.string()),
            "localOnly": t.optional(t.boolean()),
            "bypassProxyNotification": t.optional(t.boolean()),
            "ticker": t.optional(t.string()),
            "eventTime": t.optional(t.string()),
            "defaultSound": t.optional(t.boolean()),
            "tag": t.optional(t.string()),
            "clickAction": t.optional(t.string()),
            "bodyLocArgs": t.optional(t.array(t.string())),
            "titleLocKey": t.optional(t.string()),
            "lightSettings": t.optional(g("LightSettingsOut")),
            "defaultVibrateTimings": t.optional(t.boolean()),
            "visibility": t.optional(t.string()),
            "title": t.optional(t.string()),
            "icon": t.optional(t.string()),
            "channelId": t.optional(t.string()),
            "error": t.optional(g("ErrorResponse")),
        }
    ).named("AndroidNotificationOut")
    light_settings_in = t.struct(
        {
            "lightOnDuration": t.string(),
            "lightOffDuration": t.string(),
            "color": g("ColorIn"),
        }
    ).named("LightSettingsIn")
    light_settings_out = t.struct(
        {
            "lightOnDuration": t.string(),
            "lightOffDuration": t.string(),
            "color": g("ColorOut"),
            "error": t.optional(g("ErrorResponse")),
        }
    ).named("LightSettingsOut")
    webpush_config_in = t.struct(
        {
            "notification": t.optional(t.struct({})),
            "headers": t.optional(t.struct({})),
            "data": t.optional(t.struct({})),
            "fcmOptions": t.optional(g("WebpushFcmOptionsIn")),
        }
    ).named("WebpushConfigIn")
    webpush_config_out = t.struct(
        {
            "notification": t.optional(t.struct({})),
            "headers": t.optional(t.struct({})),
            "data": t.optional(t.struct({})),
            "fcmOptions": t.optional(g("WebpushFcmOptionsOut")),
            "error": t.optional(g("ErrorResponse")),
        }
    ).named("WebpushConfigOut")
    # skip:end
    # ...
    message_in = t.struct(
        {
            "name": t.optional(t.string()),
            "fcmOptions": t.optional(g("FcmOptionsIn")),
            "notification": t.optional(g("NotificationIn")),
            "android": t.optional(g("AndroidConfigIn")),
            "token": t.optional(t.string()),
            "condition": t.optional(t.string()),
            "apns": t.optional(g("ApnsConfigIn")),
            "data": t.optional(t.struct({})),
            "webpush": t.optional(g("WebpushConfigIn")),
            "topic": t.optional(t.string()),
        }
    ).named("MessageIn")
    # ...
    # skip:start
    message_out = t.struct(
        {
            "name": t.optional(t.string()),
            "fcmOptions": t.optional(g("FcmOptionsOut")),
            "notification": t.optional(g("NotificationOut")),
            "android": t.optional(g("AndroidConfigOut")),
            "token": t.optional(t.string()),
            "condition": t.optional(t.string()),
            "apns": t.optional(g("ApnsConfigOut")),
            "data": t.optional(t.struct({})),
            "webpush": t.optional(g("WebpushConfigOut")),
            "topic": t.optional(t.string()),
            "error": t.optional(g("ErrorResponse")),
        }
    ).named("MessageOut")

    remote = HTTPRuntime("https://fcm.googleapis.com/")

    projects_messages_send = remote.post(
        "v1/{parent}/messages:send",
        t.struct(
            {
                "parent": t.string(),
                "validateOnly": t.optional(t.boolean()),
                "message": g("MessageIn"),
                "auth": t.string(),
            }
        ),
        g("MessageOut"),
        auth_token_field="auth",
        content_type="application/json",
    ).named("fcm.projects.messages.send")

    g.expose(projectsMessagesSend=projects_messages_send)
