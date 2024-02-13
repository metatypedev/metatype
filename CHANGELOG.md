# Changelog

All notable changes to this project will be documented in this file.

## [v0.3.4](https://github.com/metatypedev/metatype/releases/tag/v0.3.4) - 2024-02-10

### Bug Fixes

<details >
<summary>
(ci) `upload-artifact@v4` migration, `cross` compilation for meta + typegate (<a href="https://github.com/metatypedev/metatype/pull/571">#571</a>)
</summary>

The recent update to `upload-artifact@v4` has some breaking changes as
described
[here](https://github.com/actions/upload-artifact/blob/main/docs/MIGRATION.md).
This PR addresses them. It also fixes the cross-compilation issues with
the `meta-cli` job in the release workflow.

#### Motivation and context


[Issue](https://github.com/metatypedev/metatype/actions/runs/7719983991/job/21044171984)
in release workflow.

#### Migration notes

_No changes required._

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(ci) Minor typo in `release.yml/docker` (<a href="https://github.com/metatypedev/metatype/pull/576">#576</a>)
</summary>

Small typo blocking the job that pushes the images to ghcr.io.

#### Motivation and context

[Broken
run.](https://github.com/metatypedev/metatype/actions/runs/7748712325/job/21132659221)

#### Migration notes

_No changes required._

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(ci) Missing ts modules from `typegate` image (<a href="https://github.com/metatypedev/metatype/pull/577">#577</a>)
</summary>

Adds a check step to the `typegate`'s `Dockerfile` and converts the
`.dockerignore` to be a whitelist.

#### Motivation and context

The image for 0.3.3 has some files missing.

#### Migration notes

_No changes required_

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(typegate) Fix `tmp` dir issue, bump to 0.3.4 (<a href="https://github.com/metatypedev/metatype/pull/583">#583</a>)
</summary>

- Fixes an issue with the prisma migration code being unable to properly
`mktmpd` when running in the `typegate` images.
- Removes `cross` usage for all but the `aarch64-unknown-linux-gnu`
target in the `meta-cli` release jobs. Deno doesn't like being cross
compiled, doesn't like being built by the cross toolchain in general
(even for the native target). The consequence of all this is that the
`aarch64-unknown-linux-gnu` target will temporarily lack the `full`
version builds.
- This also bumps the version of the 0.3.4 to get the fix out.

#### Motivation and context

The main `TMP_DIR` was not created properly in the `typegate`
`Dockerfile`.

#### Migration notes

_No changes required_

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Remove unallowed fields (<a href="https://github.com/metatypedev/metatype/pull/569">#569</a>)
</summary>

Skip fields with policies in `findListQueries`.

#### Motivation and context

Console.

#### Migration notes

_N/A_

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Hotfix typo in `release.yml` (<a href="https://github.com/metatypedev/metatype/pull/580">#580</a>)
</summary>

Yes, another one lol. This removes the `target` param from the release
builder which will default to the last stage of the Dockerfile, the
`epoint` stage. I elected to remove the parameter rather than replacing
the value in order to remove one more place future changes will have to
consider. (convention better than configuration the saying goes (i
think)).

#### Motivation and context

The `typegate` images currently have the wrong target and thus the wrong
`entrypoint` command.

#### Migration notes

_No changes required_

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Documentation

<details >
<summary>
(website) Cleanup (<a href="https://github.com/metatypedev/metatype/pull/521">#521</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

This mainly shuffles around the existing docs for better structure.
Still a lot to be done. The following pages are also empty as I lack the
info regarding their topics:
- Architecture
- Query engine

Super open to feedback. Bring up any points that you think should be
mentioned on each page and I'll add them.

</details>
<details >
<summary>
Getting started guide for the vscode extension (<a href="https://github.com/metatypedev/metatype/pull/578">#578</a>)
</summary>

#### Motivation and context

Documentation is missing.

#### Migration notes

_No changes needed._

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>


### Features

<details >
<summary>
(sdk) Testing framework integration (<a href="https://github.com/metatypedev/metatype/pull/566">#566</a>)
</summary>

#### Motivation and context

Enable deploying directly from the typegraph instead of always relying
on meta-cli.

#### Migration notes

N/A

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


## [v0.3.3](https://github.com/metatypedev/metatype/releases/tag/v0.3.3) - 2024-01-31

### Bug Fixes

<details >
<summary>
(ci) Bug in `typegraph` release job (<a href="https://github.com/metatypedev/metatype/pull/545">#545</a>)
</summary>

#### Motivation and context

`jco` output path is wrong.

#### Migration notes

N/A

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(ci) Typo in release.yml (<a href="https://github.com/metatypedev/metatype/pull/548">#548</a>)
</summary>

Fix small typo. Surprised `act` didn't catch this, it must evaluate
expressions lazily.

</details>
<details >
<summary>
(ci) Force/skip push to registries on manual release (<a href="https://github.com/metatypedev/metatype/pull/549">#549</a>)
</summary>

What it says on the tin can. Also fixes a typo in the `vscode-extension`
job.

#### Motivation and context

Manual re-release breaks otherwise as seen
[here](https://github.com/metatypedev/metatype/actions/runs/7508564194/job/20444227861).

</details>
<details >
<summary>
(ci) Typos in release.yml (<a href="https://github.com/metatypedev/metatype/pull/550">#550</a>)
</summary>

Oof, I can't believe I missed these. The publish steps are hard to test
locally with `act` so ig they require extra scrutiny.

#### Motivation and context

Bug on manual dispatch of `releasae` wflow.

</details>
<details >
<summary>
(ci) Mismatch in location of `$AZURE_DEVOPS_TOKEN` (<a href="https://github.com/metatypedev/metatype/pull/551">#551</a>)
</summary>

Another minor issue with the release workflow.

#### Motivation and context

Failure in release run
[here](https://github.com/metatypedev/metatype/actions/runs/7521755432/job/20472963653).

</details>
<details >
<summary>
(ci,release) Hack for broken arm64 builds, bump deno to 1.40.1, bump to 0.3.3 (<a href="https://github.com/metatypedev/metatype/pull/565">#565</a>)
</summary>

This provides a temporary fix for the broken build on arm64. The issue's
related to `wasm-opt` builds not being availaible for install by
ghjk/cargo-binstall. This PR uses `cargo install` directly instead when
in the dockerfile.

It also:
- bumps metatype version to 0.3.3 to ready the next release
- bumps the deno version to 1.40.1 (which comes with some changes)

#### Motivation and context

[Failure in CI
run.](https://github.com/metatypedev/metatype/actions/runs/7532055112/job/20501926599).

#### Migration notes

_No changes required_

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details open>
<summary>
(cli) Bad conditionals in loader detection (<a href="https://github.com/metatypedev/metatype/pull/559">#559</a>)
  - BREAKING: bad conditionals in loader detection (<a href="https://github.com/metatypedev/metatype/pull/559">#559</a>)
</summary>

- Fix bug in js typegraph loader detection.
- FIx bug where the cwd for loader was overridden in `loader_cmd`
despite being set in `get_loader_cmd`.
- Update to latest ghjk
- Refresh `setup` task in `whiz.yaml`

#### Motivation and context

The old conditionals were faulty.

#### Migration notes

- `node` and `bun` loaders are now run with the `cwd` set to the
directory of the typegraph as opposed to the `metatype.yml` file. This
should resolve settings to the nearest `package.json` despite location.

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(cli, typegate) Explicitly import DenoRuntime.import modules from path (<a href="https://github.com/metatypedev/metatype/pull/564">#564</a>)
</summary>

When using the dynamic `import` function, if you provide it a raw path
like `/foo/bar/baz` and deno detects the current module's loaded from a
remote host, it'll convert it to a http url. Reasonable behavior but it
turned out to be the cause of #560.

This pr fixes this issue along with:
- Puts contents of `main.ts` in a try/catch block for better error
logging.
- Fixes minor permission bugs with the bundled runtime.

#### Motivation and context

#560 

#### Migration notes

_No changes required_

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(oauth2-profiler) Fix OAuth2 profiler params (<a href="https://github.com/metatypedev/metatype/pull/562">#562</a>)
</summary>

Pass the appropriate request URL and headers to the profiler resolver.

#### Motivation and context

It used the provider url instead of the (typegate) request URL, causing
internal queries to fail.

#### Migration notes

_N/A_

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(template/node) Update sdk version to 0.3.2 + add `deno.static` (<a href="https://github.com/metatypedev/metatype/pull/558">#558</a>)
</summary>

#### Motivation and context

Sync template examples with latest 0.3.2.
Added missing `deno.static` and `func.rate(...)` on node.

#### Migration notes

N/A

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(vscode-extension) Fix publisher name and version (<a href="https://github.com/metatypedev/metatype/pull/553">#553</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

- Change the publisher name to **metatypedev** to match the account name
on Azure Devops.
- Add dev-tools projects to `dev/lock.yml` for automatic versioning.

#### Motivation and context

*
[Failure](https://github.com/metatypedev/metatype/actions/runs/7522189733/job/20473888302)
to publish the extension.
* Non-matching version.

#### Migration notes

_Blank_

### Checklist

- [ ] ~The change come with new or modified tests~ _(N/A)_
- [ ] ~Hard-to-understand functions have explanatory comments~ _(N/A)_
- [ ] ~End-user documentation is updated to reflect the change~ _(N/A)_

</details>


### Documentation

<details >
<summary>
(website) Move typegraphs in separate folder + add ts version (<a href="https://github.com/metatypedev/metatype/pull/552">#552</a>)
</summary>

#### Motivation and context

Better organization + typescript examples.

#### Migration notes

N/A

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>


### Features

<details >
<summary>
(node) Node fontend missing features (<a href="https://github.com/metatypedev/metatype/pull/557">#557</a>)
</summary>

#### Motivation and context

Easier translation from python to typescript typegraph.

#### Migration notes

N/A

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(prisma) Add support multi-field ids and id on struct (<a href="https://github.com/metatypedev/metatype/pull/556">#556</a>)
</summary>

Adds support for more advanced id fields and unique constraints:
- Multi-field id
- Id on struct (foreign key)
- Multi-field unique constraints
- Unique constraint on struct (foreign key)

#### Motivation and context

Support these kind of construct:

```python
user = t.struct(
  {
    "authProvider": t.string().from_context("provider"),
    "profileId": t.string().from_context("profile.id"),
    # ...
  },
  config={"id": ["authProvider", "profileId"]},
).rename("User")

project = t.struct(
  {
    "id": t.uuid(as_id=True, config=["auto"]),
    "owner": g.ref("Account"),
    "name": t.string(min=3, pattern="^[A-Za-z_-]$"),
  },
  config={"unique": [["owner", "name"]]}
).rename("Project")
```


#### Migration notes

_No migration needed._

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(typegate) Oauth2 token validation endpoint (<a href="https://github.com/metatypedev/metatype/pull/567">#567</a>)
</summary>

Create an oauth2 token validation endpoint: `/:tgName/auth/validate`.


#### Motivation and context

<!-- Explain WHY the was made or link an issue number -->

#### Migration notes

<!-- Explain HOW users should update their code when required -->

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(typegate-rt) Extend typegate runtime (<a href="https://github.com/metatypedev/metatype/pull/561">#561</a>)
</summary>

Extend the typegate runtime with the following queries:
- `findListQueries`: find all the queries that returns a list of
`t.struct`.

#### Motivation and context

Console.

#### Migration notes

_N/A_

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(vscode-ext) Logo, README, display name, description (<a href="https://github.com/metatypedev/metatype/pull/554">#554</a>)
</summary>

- Added a better display name and description
- Added logo and README

</details>
<details >
<summary>
Flattened context (<a href="https://github.com/metatypedev/metatype/pull/555">#555</a>)
</summary>

Flatten profile fields in the context.

So instead of
```js
{
    provider: 'github',
    accessToken: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    refreshToken: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    refreshAt: 1704717676,
    profile: { id: '43663718' },
    exp: 1707280877,
    iat: 1704688876
}
```

we would have:
```js
{
    provider: 'github',
    accessToken: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    refreshToken: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    refreshAt: 1704717676,
    'profile.id': '43663718',
    exp: 1707280877,
    iat: 1704688876
 }
```

#### Motivation and context

It was impossible to get the nested id into a `from_context` injection.
Now we can inject `.from_context("profile.id")`.

#### Migration notes

<!-- Explain HOW users should update their code when required -->

### Checklist

- [ ] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Refactor

<details >
<summary>
(ci) `workflow_dispatch` for release wflow (<a href="https://github.com/metatypedev/metatype/pull/546">#546</a>)
</summary>

- Manual trigger for release wflow
- Adds missing ghjk step for `vscode-extension` release job

#### Motivation and context

Provides recovery path for when things break.

#### Migration notes

Doesn't affect end users.

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


## [v0.3.2](https://github.com/metatypedev/metatype/releases/tag/v0.3.2) - 2024-01-12

### Bug Fixes

<details >
<summary>
(ci) Release changelog generation (<a href="https://github.com/metatypedev/metatype/pull/542">#542</a>)
</summary>

#### Describe your change

Configures the `checkout` action step in the workflow that generates the
workflow to clone the full git history.

#### Motivation and context

The updates to the release workflow that introduce [git
cliff](https://git-cliff.org/) based changelogs (back in #487) don't
appear to be in effect.

#### Migration notes

No end user changes required.

#### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(website) Fix docusaurus warnings (<a href="https://github.com/metatypedev/metatype/pull/526">#526</a>)
</summary>

### Describe your change

Fix docusaurus warnings on the website

### Motivation and context

Solves
[MET-307](https://metatype.atlassian.net/jira/software/c/projects/MET/boards/2?selectedIssue=MET-307)

### Migration notes

<!-- Explain HOW users should update their code when required -->

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Fix stage iteration (<a href="https://github.com/metatypedev/metatype/pull/540">#540</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

- Fix the `iterChildStages` function. It does not yield accurate values
in some edge cases.
- Update the testing framework to enable planning without executing on
the `GraphQLQuery` object.

### Motivation and context

Sibling stages can be falsely registered as children, for example with
the following stages:
```
getUser.id
getUser.identity
getUser.ideas
```

### Migration notes

_No migration needed._

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments (_N/A_)
- [x] End-user documentation is updated to reflect the change (_N/A_)

---------

</details>


### Features

<details >
<summary>
(cli) Interactive deployment for prisma (<a href="https://github.com/metatypedev/metatype/pull/527">#527</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

Make the CLI interactive for migration options to development and
production databases.

### Motivation and context

[MET-257](https://metatype.atlassian.net/browse/MET-257)

### Migration notes

This creates some breaking changes if you use the CLI in a
non-interactive way.

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
(gate) Redis-less mode (<a href="https://github.com/metatypedev/metatype/pull/528">#528</a>)
</summary>

### Describe your change

Fallback to `MemoryRegister` and `NoLimiter` if typegate is unable to
connect to Redis.

### Motivation and context

Enable Redis-Less mode.

### Migration notes

<!-- Explain HOW users should update their code when required -->

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(lsp) Simple diagnostics (<a href="https://github.com/metatypedev/metatype/pull/496">#496</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

Adds a simple LSP implementation for diagnostics.

### Motivation and context

Better DX, catch potential errors while editing the typegraph module.

### Migration notes

<!-- Explain HOW users should update their code when required -->

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
(prisma) Connect/create many relation (<a href="https://github.com/metatypedev/metatype/pull/522">#522</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

- Add missing `create: [ ... ]` and `connect: [ ... ]`

### Motivation and context

Solves
[MET-304](https://metatype.atlassian.net/jira/software/c/projects/MET/boards/2?selectedIssue=MET-304)

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(python_wasi) Vm docking (<a href="https://github.com/metatypedev/metatype/pull/520">#520</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

- Bump all WasmEdge dependencies to latest version
- Replace `wasmedge_sdk_bindgen` with `VmDock`

### Motivation and context

`wasmedge_sdk_bindgen` is deprecated, `VmDock` replaces it entirely. 


### Checklist

- [ ] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(sdk/node) Move js deno to node (<a href="https://github.com/metatypedev/metatype/pull/539">#539</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

Change deno frontend to pure node

### Motivation and context

Easier integration.

### Migration notes

<!-- Explain HOW users should update their code when required -->

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Customizable oauth2 profiler (<a href="https://github.com/metatypedev/metatype/pull/538">#538</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

Enable custom profiler for the std (predefined) Oauth2 providers:
- Default profiler
- No profiler
- Extended default profiler
- Custom profiler

### Motivation and context

We may want for example to add the Github login in the profile in
addition to the id.

### Migration notes

_No migration needed._

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Limited parallel loads (<a href="https://github.com/metatypedev/metatype/pull/537">#537</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

Limit the number of parallel loads.
The default max is the number of CPU cores, but it can be set with the
option `--max-parallel-loads=N`.

### Motivation and context

When we have a high number of typegraphs, the loader processes exhaust
the CPU load.

### Migration notes

_No migration needed._

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>


### Miscellaneous Tasks

<details >
<summary>
(release) Bump 0.3.2 (<a href="https://github.com/metatypedev/metatype/pull/543">#543</a>)
</summary>

Bump the version of all metatype libs to 0.3.2.

#### Motivation and context

About to tag the next version.

#### Migration notes

Change their manifests to point at the new version.

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Refactor

<details >
<summary>
(ci) Use `ghjk` for deps (<a href="https://github.com/metatypedev/metatype/pull/495">#495</a>)
</summary>

### Describe your change


This PR merges most of the CI test runs into one and make use of the
`ghjk` tool to install most of the dependencies.

### Motivation and context

Improve tool dependency management.

### Migration notes

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Use shadow_rs for versions (<a href="https://github.com/metatypedev/metatype/pull/523">#523</a>)
</summary>

### Describe your change

Replaces the `common::get_version` util function with the `PKG_VERSION`
variables extracted from `shadow_rs`.

If you know of any other opportunities where we can replace things from
`shadow_rs`, we can add them in this PR as wel..

### Motivation and context

`shadow_rs` makes the old function redundant

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Testing

<details >
<summary>
(gate) Add tests with file upload and apollo client (<a href="https://github.com/metatypedev/metatype/pull/529">#529</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

Add file upload test using raw fetch and apollo client.

### Motivation and context

Ensure common uses of upload feature to work.

### Migration notes

<!-- Explain HOW users should update their code when required -->

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


## [v0.3.1](https://github.com/metatypedev/metatype/releases/tag/v0.3.1) - 2023-12-08

### Bug Fixes

<details >
<summary>
(ci) Release workflow bugs (<a href="https://github.com/metatypedev/metatype/pull/518">#518</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

<!-- Explain WHAT the change is -->

Fix the release workflow according to the CI updates from #487.

### Motivation and context

Bug.
<!-- Explain WHY the was made or link an issue number -->

### Migration notes

<!-- Explain HOW users should update their code when required -->

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Git cliff
</summary>



</details>


## [v0.3.0](https://github.com/metatypedev/metatype/releases/tag/v0.3.0) - 2023-12-08

### Bug Fixes

<details >
<summary>
(gate) Pushing a typegraph must not timeout (<a href="https://github.com/metatypedev/metatype/pull/511">#511</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

Retry policy eval one more time if too long

### Motivation and context


[MET-296](https://metatype.atlassian.net/jira/software/c/projects/MET/boards/2?selectedIssue=MET-296)

</details>
<details >
<summary>
(tests) Use  temporary directories for test git repositories (<a href="https://github.com/metatypedev/metatype/pull/485">#485</a>)
</summary>



</details>
<details >
<summary>
(xtask) Add support for end of flags and typechecking (<a href="https://github.com/metatypedev/metatype/pull/493">#493</a>)
</summary>

### Describe your change

Adds support for end of flags arguments to the `cargo x deno test/bench`
commands.

### Motivation and context

Fix an issue that preventing a updating snapshots as implemented in the
`dev/test.ts` script.

</details>
<details >
<summary>
Small fixes (<a href="https://github.com/metatypedev/metatype/pull/486">#486</a>)
</summary>



</details>
<details >
<summary>
Remove `meta prisma` subcommand (<a href="https://github.com/metatypedev/metatype/pull/490">#490</a>)
</summary>

Solve [MET-292](https://metatype.atlassian.net/browse/MET-292)

</details>
<details >
<summary>
Typed result and similar (<a href="https://github.com/metatypedev/metatype/pull/509">#509</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

Fixes datetime return type by returning the `value` field instead of the
whole object.

### Motivation and context

Prisma has a `$type` tag for formatted string such as `DateTime`, this
PR aims to add support for that.

### Migration notes

<!-- Explain HOW users should update their code when required -->

### Checklist

- [ ] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Fix default argument computation for objects (<a href="https://github.com/metatypedev/metatype/pull/510">#510</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

Fix the default argument computation.
Make non-optional objects optional if all of its fields are optional.

### Motivation and context

[MET-295](https://metatype.atlassian.net/browse/MET-295)

### Migration notes

*N/A*

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [x] ~End-user documentation is updated to reflect the change~: *N/A*

</details>
<details >
<summary>
Revert deno to 1.38.1 (<a href="https://github.com/metatypedev/metatype/pull/516">#516</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

Revert the embedded deno to 1.38.1.

### Motivation and context

Deno 1.38.2 does not work well with the FFI bindings.

</details>


### Features

<details >
<summary>
(cli) Actor model (<a href="https://github.com/metatypedev/metatype/pull/471">#471</a>)
</summary>



</details>
<details >
<summary>
(cli) Nodejs loader (<a href="https://github.com/metatypedev/metatype/pull/515">#515</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

Add support for using nodejs runtime to execute and serialize typescript
based typegraphs. This also adds support for `MCLI_LOADER_CMD` that can
be used to override the command to exec the typegraphs.

### Motivation and context

Previously, `meta-cli` either used the and `python` & `deno` runtimes to
serialize the typegraphs. Now that `@typegraph/sdk` also supports
Node.js, users might be developing in environments wher `deno` runtime
is not availaible but `node` is. This PR provides a way fwd in those
cases.

### Migration notes

<!-- Explain HOW users should update their code when required -->

### Checklist

- [ ] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(cli) Meta undeploy subcommand (<a href="https://github.com/metatypedev/metatype/pull/508">#508</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

Add `undeploy` subcommand to the meta CLI.

### Motivation and context

- Allow user to undeploy a typegraph.
- We always had resource leak error when deploying a typegraph from a
test step. This subcommand would allow us to undeploy the typegraph at
the end of the test step.

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] ~End-user documentation is updated to reflect the change~: *N/A*

</details>
<details >
<summary>
(prisma/migrations) Default value on new column (<a href="https://github.com/metatypedev/metatype/pull/465">#465</a>)
</summary>

- [x] Display a more concise error message for new column that failed
the NON NULL constraint during the migration.
- [x] Enable user to set default value on new NON NULL column.

---------

</details>
<details >
<summary>
(sdk,gate) Node information by path (<a href="https://github.com/metatypedev/metatype/pull/498">#498</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

* Fixes renamed function in sdk
* Adds `argInfoByPath` utility function in `typegate.py`

### Motivation and context

Make the task of fetching type information from the graphql function
args easier

### Migration notes

<!-- Explain HOW users should update their code when required -->

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
`mt_deno` (<a href="https://github.com/metatypedev/metatype/pull/466">#466</a>)
</summary>

Todo in this PR:
- [x] Expose `bench` and `test` sub commands from deno

This approach gives us a binary size of 101 MiB stripped and 143 MiB
prior.

</details>
<details >
<summary>
Docs update + project structure (<a href="https://github.com/metatypedev/metatype/pull/487">#487</a>)
</summary>



</details>


### Refactor

<details >
<summary>
(typegraph/core) Remove wrapper types (<a href="https://github.com/metatypedev/metatype/pull/489">#489</a>)
</summary>

Solve [MET-260](https://metatype.atlassian.net/browse/MET-260).
Wrapper types will be implemented like `.rename(...)`.
- [x] Remove `WithInjection` type
- [x] Remove `WithPolicy` type
- [x] Remove `WrapperType<T>`

---------

</details>
<details >
<summary>
Sdk dx (<a href="https://github.com/metatypedev/metatype/pull/470">#470</a>)
</summary>

- [x] rename apply to reduce
- [x] move t.ref to g.ref and remove t.proxy
- [x] rename t.array to t.list
- [x] standard policies should defined in core
- [x] remove python* section in metatype.yml

</details>
<details >
<summary>
Replace `deno_bindgen` ffi with v8 `Extension` ffi (<a href="https://github.com/metatypedev/metatype/pull/481">#481</a>)
</summary>

What's pending:

- [x] Replace usage and make sure tests run successfully
- [x] Remove old binding code

</details>
<details >
<summary>
Three binaries (<a href="https://github.com/metatypedev/metatype/pull/483">#483</a>)
</summary>

TL;DR
- `meta typegate` that uses the ecma sources hosted on GitHub 
  - This is configurable using flags
- `cargo x typegate` that uses the local sources from `./typegate/src`
- `typegate_prod` that also uses sources from `./typegate/src` as might
be found in it's container
  - This behavior is configurable using environment variables

</details>


### Testing

<details >
<summary>
Move cli e2e test to typegate/tests/e2e (<a href="https://github.com/metatypedev/metatype/pull/492">#492</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

Move CLI e2e tests to typegate/tests/e2e

### Motivation and context

[MET-208](https://metatype.atlassian.net/browse/MET-208)


### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Fix tests (<a href="https://github.com/metatypedev/metatype/pull/507">#507</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

### Describe your change

Attempt to fix all the failing tests in the main branch.

- Test parallelization requires tests to use different:
  - temporary git repositories (previously solved);
  - different port for virtual typegate instances;
  - different database namespace (postgres schema).
This applies to `e2e/cli/deploy_test.ts` and
`e2e/typegraph/templates_test.ts`.
- A regression was introduced by a previous by a previous PR on the
typegraph serialization, that disabled injection for union/either types.
- Most of the snapshots were outdated.

---------

</details>


## [v0.2.4](https://github.com/metatypedev/metatype/releases/tag/v0.2.4) - 2023-10-25

### Bug Fixes

<details >
<summary>
(sdk) Reduce union/either variant if required in apply syntax (<a href="https://github.com/metatypedev/metatype/pull/463">#463</a>)
</summary>



</details>
<details >
<summary>
Fix lock.yml (<a href="https://github.com/metatypedev/metatype/pull/459">#459</a>)
</summary>

Fix lock.yml to set WASM_OPT_VERSION in whiz.yaml

</details>
<details >
<summary>
Fix doc typegraphs deployment (<a href="https://github.com/metatypedev/metatype/pull/462">#462</a>)
</summary>



</details>
<details >
<summary>
Set metatype version to v0.2.4 (<a href="https://github.com/metatypedev/metatype/pull/467">#467</a>)
</summary>



</details>


### Features

<details >
<summary>
Pre-registered public policy (<a href="https://github.com/metatypedev/metatype/pull/461">#461</a>)
</summary>

The PolicyId for the public policy was cached in a class variable in
`Policy`.
The cache was not valid in a second typegraph defined in the same
module.

</details>


## [v0.2.3](https://github.com/metatypedev/metatype/releases/tag/v0.2.3) - 2023-10-19

### Bug Fixes

<details >
<summary>
(gate) Explicit null on query arg (<a href="https://github.com/metatypedev/metatype/pull/453">#453</a>)
</summary>

Solves MET-268 + fixes an edgecase for "weak validation"

</details>


### Features

<details >
<summary>
(gate,sdk) Update auth interface, better oauth2 (<a href="https://github.com/metatypedev/metatype/pull/447">#447</a>)
</summary>



</details>
<details >
<summary>
Remove injected fields from generated types for prisma operations (<a href="https://github.com/metatypedev/metatype/pull/448">#448</a>)
</summary>

Injected fields are skipped when generating types for prisma.

Additional changes:
- Enable recursive relationships in where filters.
- Add `disconnect`, `update`, `upsert`, `delete`, `updateMany`,
`deleteMany` on nested reletionships for create/update operations.
- Fix optional union arg validation.

</details>


### Miscellaneous Tasks

<details >
<summary>
Upgrade wasm-opt (<a href="https://github.com/metatypedev/metatype/pull/456">#456</a>)
</summary>



</details>


## [v0.2.2](https://github.com/metatypedev/metatype/releases/tag/v0.2.2) - 2023-10-11

### Bug Fixes

<details >
<summary>
(gate) Script reload while gate is running (<a href="https://github.com/metatypedev/metatype/pull/441">#441</a>)
</summary>



</details>


### Features

<details >
<summary>
(sdk) Change rest queries interface (<a href="https://github.com/metatypedev/metatype/pull/444">#444</a>)
</summary>



</details>
<details >
<summary>
Stability fixes (<a href="https://github.com/metatypedev/metatype/pull/442">#442</a>)
</summary>



</details>
<details >
<summary>
Wasm + change effect none to read (<a href="https://github.com/metatypedev/metatype/pull/443">#443</a>)
</summary>



</details>


## [v0.2.1](https://github.com/metatypedev/metatype/releases/tag/v0.2.1) - 2023-10-05

### Bug Fixes

<details >
<summary>
Update rename logic (<a href="https://github.com/metatypedev/metatype/pull/439">#439</a>)
</summary>

Duplicate the store entry instead of referencing.

</details>


### Refactor

<details >
<summary>
(typegraph_core) Simplify private rust SDK (<a href="https://github.com/metatypedev/metatype/pull/432">#432</a>)
</summary>



</details>


## [v0.2.0](https://github.com/metatypedev/metatype/releases/tag/v0.2.0) - 2023-10-04

### Bug Fixes

<details >
<summary>
(gate) Introspection if func has the same input/output (<a href="https://github.com/metatypedev/metatype/pull/431">#431</a>)
</summary>



</details>
<details >
<summary>
(sdk,deno,python) Generate func from frontend + prisma deno frontend (<a href="https://github.com/metatypedev/metatype/pull/416">#416</a>)
</summary>



</details>


### Features

<details >
<summary>
(core) Set runtime field in types (<a href="https://github.com/metatypedev/metatype/pull/398">#398</a>)
</summary>



</details>
<details >
<summary>
(sdk) Add wasmedge runtime (<a href="https://github.com/metatypedev/metatype/pull/397">#397</a>)
</summary>



</details>
<details >
<summary>
(sdk) Random runtime (<a href="https://github.com/metatypedev/metatype/pull/396">#396</a>)
</summary>

* +runtime_config

</details>
<details >
<summary>
(sdk) Implement injection (<a href="https://github.com/metatypedev/metatype/pull/403">#403</a>)
</summary>



</details>
<details >
<summary>
(sdk) Rate limiting, cors, etc.. (<a href="https://github.com/metatypedev/metatype/pull/411">#411</a>)
</summary>



</details>
<details >
<summary>
(sdk) Add the prisma runtime to the new SDK (<a href="https://github.com/metatypedev/metatype/pull/395">#395</a>)
</summary>



</details>
<details >
<summary>
(sdk) Apply syntax (<a href="https://github.com/metatypedev/metatype/pull/410">#410</a>)
</summary>



</details>
<details >
<summary>
(sdk) Temporal runtime (<a href="https://github.com/metatypedev/metatype/pull/413">#413</a>)
</summary>



</details>
<details >
<summary>
(sdk) Custom query exec for prisma runtime (<a href="https://github.com/metatypedev/metatype/pull/419">#419</a>)
</summary>



</details>
<details >
<summary>
V0.2.x series + upgrades (<a href="https://github.com/metatypedev/metatype/pull/417">#417</a>)
</summary>



</details>
<details >
<summary>
Upgrade jco and prepare sdk build (<a href="https://github.com/metatypedev/metatype/pull/420">#420</a>)
</summary>



</details>
<details >
<summary>
Sdk build with wasm (<a href="https://github.com/metatypedev/metatype/pull/421">#421</a>)
</summary>



</details>
<details >
<summary>
Add `typedef.rename()` method (<a href="https://github.com/metatypedev/metatype/pull/426">#426</a>)
</summary>



</details>
<details >
<summary>
Release 0.2.0 (<a href="https://github.com/metatypedev/metatype/pull/434">#434</a>)
</summary>



</details>


### Miscellaneous Tasks

<details >
<summary>
Migrate all the test typegraphs to the new Python SDK (<a href="https://github.com/metatypedev/metatype/pull/418">#418</a>)
</summary>



</details>
<details >
<summary>
Migrate doc typegraphs (<a href="https://github.com/metatypedev/metatype/pull/429">#429</a>)
</summary>



</details>
<details >
<summary>
Remove old typegraph sdk (<a href="https://github.com/metatypedev/metatype/pull/430">#430</a>)
</summary>



</details>
<details >
<summary>
Check that all interfaces are implemented in both sdk (<a href="https://github.com/metatypedev/metatype/pull/435">#435</a>)
</summary>



</details>
<details >
<summary>
Hotfix release flow
</summary>



</details>
<details >
<summary>
Hotfix release
</summary>



</details>


### Refactor

<details >
<summary>
Make `with_store` and `with_store_mut` private in `global_store` module (<a href="https://github.com/metatypedev/metatype/pull/414">#414</a>)
</summary>



</details>


