# How-to upload images to S3

## Typegraph

```ini
TG_RETREND_ACCESS_KEY=minio
TG_RETREND_SECRET_KEY=password
```

```py
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.s3 import S3Runtime
from typegraph.policies import allow_all

with TypeGraph(
    "retrend",
) as g:

    all = allow_all()
    s3 = S3Runtime("http://localhost:9000", "local", "access_key", "secret_key")

    g.expose(
        presigned=s3.sign("images", "image/png").add_policy(all),
    )
```

## Usage

```ts
const image = await Deno.readFile("website/static/img/logo.png");

const { data: { presigned } } = await fetch("http://localhost:7891/retrend", {
  method: "POST",
  body: JSON.stringify({
    "query": `
        query sign($length: Int) {
            presigned(length: $length, path: "my-super-image.png")
        }
    `,
    "variables": {
      "length": image.length,
    },
  }),
}).then((r) => r.json());

const upload = await fetch(
  presigned,
  {
    method: "PUT",
    body: image,
    headers: {
      "content-type": "image/png",
      "content-length": image.length,
    },
  },
);

console.log(upload.status);
```
