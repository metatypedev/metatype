---
sidebar_position: 99
---

# Self-host the Typegate

## Helm

[Helm](https://helm.sh) must be installed to use the charts. Please refer to
Helm's documentation to get started. The chart can be accessed on the dedicated
[repository](https://github.com/metatypedev/charts).

Once Helm has been set up correctly, add the repo as follows:

```shell
helm repo add metatype https://charts.metatype.dev
helm show values metatype/typegate > values.yml
# customize values.yaml
helm install my-gate --values values.yml metatype/typegate
```
