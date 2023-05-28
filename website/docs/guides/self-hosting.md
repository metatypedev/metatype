# Self-hosting

## Helm

[Helm](https://helm.sh) must be installed to use the charts. Please refer to
Helm's [documentation](https://helm.sh/docs) to get started.

Once Helm has been set up correctly, add the repo as follows:

```shell
helm repo add metatype https://charts.metatype.dev
helm show values metatype/typegate > values.yml
# customize values.yaml
helm install my-gate --values values.yml metatype/typegate
```
