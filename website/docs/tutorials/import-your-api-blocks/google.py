# skip:start
from typegraph import effects
from typegraph import t
from typegraph import TypeGraph
from typegraph.importers.google_discovery import import_googleapis
from typegraph.providers.google.runtimes import googleapis

discovery = "https://fcm.googleapis.com/$discovery/rest?version=v1"
import_googleapis(discovery, False)  # set to True to re-import the API

with TypeGraph(
    "fcm",
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    color_in = t.struct(
        {"alpha": t.float(), "green": t.float(), "blue": t.float(), "red": t.float()}
    ).named("ColorIn")
    color_out = t.struct(
        {"alpha": t.float(), "green": t.float(), "blue": t.float(), "red": t.float()}
    ).named("ColorOut")
    android_fcm_options_in = t.struct({"analyticsLabel": t.string()}).named(
        "AndroidFcmOptionsIn"
    )
    android_fcm_options_out = t.struct({"analyticsLabel": t.string()}).named(
        "AndroidFcmOptionsOut"
    )
    notification_in = t.struct(
        {"title": t.string(), "body": t.string(), "image": t.string()}
    ).named("NotificationIn")
    notification_out = t.struct(
        {"title": t.string(), "body": t.string(), "image": t.string()}
    ).named("NotificationOut")
    android_notification_in = t.struct(
        {
            "vibrateTimings": t.array(t.string()),
            "icon": t.string(),
            "titleLocKey": t.string(),
            "notificationCount": t.integer(),
            "titleLocArgs": t.array(t.string()),
            "clickAction": t.string(),
            "tag": t.string(),
            "visibility": t.string(),
            "bypassProxyNotification": t.boolean(),
            "bodyLocKey": t.string(),
            "ticker": t.string(),
            "lightSettings": g("LightSettingsIn"),
            "bodyLocArgs": t.array(t.string()),
            "notificationPriority": t.string(),
            "eventTime": t.string(),
            "image": t.string(),
            "title": t.string(),
            "body": t.string(),
            "color": t.string(),
            "sticky": t.boolean(),
            "defaultSound": t.boolean(),
            "sound": t.string(),
            "defaultVibrateTimings": t.boolean(),
            "localOnly": t.boolean(),
            "channelId": t.string(),
            "defaultLightSettings": t.boolean(),
        }
    ).named("AndroidNotificationIn")
    android_notification_out = t.struct(
        {
            "vibrateTimings": t.array(t.string()),
            "icon": t.string(),
            "titleLocKey": t.string(),
            "notificationCount": t.integer(),
            "titleLocArgs": t.array(t.string()),
            "clickAction": t.string(),
            "tag": t.string(),
            "visibility": t.string(),
            "bypassProxyNotification": t.boolean(),
            "bodyLocKey": t.string(),
            "ticker": t.string(),
            "lightSettings": g("LightSettingsOut"),
            "bodyLocArgs": t.array(t.string()),
            "notificationPriority": t.string(),
            "eventTime": t.string(),
            "image": t.string(),
            "title": t.string(),
            "body": t.string(),
            "color": t.string(),
            "sticky": t.boolean(),
            "defaultSound": t.boolean(),
            "sound": t.string(),
            "defaultVibrateTimings": t.boolean(),
            "localOnly": t.boolean(),
            "channelId": t.string(),
            "defaultLightSettings": t.boolean(),
        }
    ).named("AndroidNotificationOut")
    webpush_fcm_options_in = t.struct(
        {"link": t.string(), "analyticsLabel": t.string()}
    ).named("WebpushFcmOptionsIn")
    webpush_fcm_options_out = t.struct(
        {"link": t.string(), "analyticsLabel": t.string()}
    ).named("WebpushFcmOptionsOut")
    light_settings_in = t.struct(
        {
            "lightOnDuration": t.string(),
            "color": g("ColorIn"),
            "lightOffDuration": t.string(),
        }
    ).named("LightSettingsIn")
    light_settings_out = t.struct(
        {
            "lightOnDuration": t.string(),
            "color": g("ColorOut"),
            "lightOffDuration": t.string(),
        }
    ).named("LightSettingsOut")
    webpush_config_in = t.struct(
        {
            "headers": t.struct({"_": t.optional(t.any())}),
            "fcmOptions": g("WebpushFcmOptionsIn"),
            "data": t.struct({"_": t.optional(t.any())}),
            "notification": t.struct({"_": t.optional(t.any())}),
        }
    ).named("WebpushConfigIn")
    webpush_config_out = t.struct(
        {
            "headers": t.struct({"_": t.optional(t.any())}),
            "fcmOptions": g("WebpushFcmOptionsOut"),
            "data": t.struct({"_": t.optional(t.any())}),
            "notification": t.struct({"_": t.optional(t.any())}),
        }
    ).named("WebpushConfigOut")
    apns_fcm_options_in = t.struct(
        {"analyticsLabel": t.string(), "image": t.string()}
    ).named("ApnsFcmOptionsIn")
    apns_fcm_options_out = t.struct(
        {"analyticsLabel": t.string(), "image": t.string()}
    ).named("ApnsFcmOptionsOut")
    fcm_options_in = t.struct({"analyticsLabel": t.string()}).named("FcmOptionsIn")
    fcm_options_out = t.struct({"analyticsLabel": t.string()}).named("FcmOptionsOut")
    apns_config_in = t.struct(
        {
            "fcmOptions": g("ApnsFcmOptionsIn"),
            "payload": t.struct({"_": t.optional(t.any())}),
            "headers": t.struct({"_": t.optional(t.any())}),
        }
    ).named("ApnsConfigIn")
    apns_config_out = t.struct(
        {
            "fcmOptions": g("ApnsFcmOptionsOut"),
            "payload": t.struct({"_": t.optional(t.any())}),
            "headers": t.struct({"_": t.optional(t.any())}),
        }
    ).named("ApnsConfigOut")
    android_config_in = t.struct(
        {
            "fcmOptions": g("AndroidFcmOptionsIn"),
            "ttl": t.string(),
            "restrictedPackageName": t.string(),
            "directBootOk": t.boolean(),
            "data": t.struct({"_": t.optional(t.any())}),
            "collapseKey": t.string(),
            "notification": g("AndroidNotificationIn"),
            "priority": t.string(),
        }
    ).named("AndroidConfigIn")
    android_config_out = t.struct(
        {
            "fcmOptions": g("AndroidFcmOptionsOut"),
            "ttl": t.string(),
            "restrictedPackageName": t.string(),
            "directBootOk": t.boolean(),
            "data": t.struct({"_": t.optional(t.any())}),
            "collapseKey": t.string(),
            "notification": g("AndroidNotificationOut"),
            "priority": t.string(),
        }
    ).named("AndroidConfigOut")

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
            "notification": g("NotificationOut"),
            "condition": t.string(),
            "topic": t.string(),
            "data": t.struct({"_": t.optional(t.any())}),
            "android": g("AndroidConfigOut"),
            "token": t.string(),
            "apns": g("ApnsConfigOut"),
            "fcmOptions": g("FcmOptionsOut"),
            "name": t.string(),
            "webpush": g("WebpushConfigOut"),
        }
    ).named("MessageOut")
    send_message_request_in = t.struct(
        {"message": g("MessageIn"), "validateOnly": t.boolean()}
    ).named("SendMessageRequestIn")
    send_message_request_out = t.struct(
        {"message": g("MessageOut"), "validateOnly": t.boolean()}
    ).named("SendMessageRequestOut")

    g.expose(
        projectsMessagesSend=t.func(
            t.struct(
                {
                    "parent": t.string(),
                }
            ),
            g("MessageOut"),
            googleapis.RestMat(
                "POST",
                "https://fcm.googleapis.com/v1/{+parent}/messages:send",
                effect=effects.create(),
            ),
        ).named("fcm.projects.messages.send"),
    )
