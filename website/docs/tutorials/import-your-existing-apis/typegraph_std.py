from typegraph import TypeGraph, policies
from typegraph_std.github.ghes import import_ghes
from typegraph_std.google.gmail import import_gmail

with TypeGraph(
    "emails",
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    public = policies.public()

    # {protocol}://{hostname}/api/v3
    github = import_ghes({"protocol": "https", "hostname": "custom_host"})

    gmail = import_gmail()

    g.expose(
        list_emails=github.functions.users_list_emails_for_authenticated_user,
        **gmail.functions,
        default_policy=[public]
    )
