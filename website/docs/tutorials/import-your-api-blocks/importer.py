from typegraph.graph.typegraph import TypeGraph
from typegraph.importers.google_discovery import GoogleDiscoveryImporter

GoogleDiscoveryImporter(
    "googleapi", url="https://fcm.googleapis.com/$discovery/rest?version=v1"
).imp(False)

with TypeGraph(name="google-test"):
    pass
