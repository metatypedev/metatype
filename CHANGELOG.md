# Changelog

All notable changes to this project will be documented in this file.

## [v0.4.10](https://github.com/metatypedev/metatype/releases/tag/v0.4.10) - 2024-09-04

### Miscellaneous Tasks

<details >
<summary>
Bump to v0.4.10 (<a href="https://github.com/metatypedev/metatype/pull/835">#835</a>)
</summary>

- Bump v0.4.10

</details>


## [v0.4.10-rc1](https://github.com/metatypedev/metatype/releases/tag/v0.4.10-rc1) - 2024-09-03

### Bug Fixes

<details >
<summary>
Use import_map at runtime (<a href="https://github.com/metatypedev/metatype/pull/833">#833</a>)
</summary>

- Bump to release v0.4.10-rc1
- Use import_map.json at runtime since remote configs aren't supported

</details>


## [v0.4.9](https://github.com/metatypedev/metatype/releases/tag/v0.4.9) - 2024-09-02

### Miscellaneous Tasks

<details >
<summary>
Bump to v0.4.9 (<a href="https://github.com/metatypedev/metatype/pull/831">#831</a>)
</summary>

- Bump version to v0.4.9
- Fix issue with cross config context

</details>


## [v0.4.9-rc2](https://github.com/metatypedev/metatype/releases/tag/v0.4.9-rc2) - 2024-09-02

### Miscellaneous Tasks

<details >
<summary>
(release) Prepare 0.4.9-rc2 (<a href="https://github.com/metatypedev/metatype/pull/829">#829</a>)
</summary>

- Fix the minor issues with rc1
- Bump to rc2

</details>


## [v0.4.9-rc1](https://github.com/metatypedev/metatype/releases/tag/v0.4.9-rc1) - 2024-09-02

### Features

<details >
<summary>
(docs) Post on `Durable Execution`. (<a href="https://github.com/metatypedev/metatype/pull/816">#816</a>)
</summary>



</details>
<details >
<summary>
(metagen) Client_ts (<a href="https://github.com/metatypedev/metatype/pull/790">#790</a>)
</summary>

- Implements `client_ts` as described in #777 .

#### Migration notes

...

- [x] The change comes with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **Bug Fixes**
- Improved error handling in the `typegraph` function to provide better
error messages.

- **Chores**
- Updated Docker image references to use `docker.io` prefix for
consistency.
  - Excluded unnecessary files from the VSCode settings.
  - Enhanced configurability of Docker commands in development tasks.
- Updated environment variable `GHJK_VERSION` to reflect a semantic
versioning format.

- **New Features**
- Introduced modules and methods for TypeScript and Python code
generation in the `metagen` library, enhancing client generation
capabilities.
  - Added `test_typegraph_3` function for improved testing capabilities.
  - Included metadata for the package manager in the project settings.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
(sub) Sdk and typing (<a href="https://github.com/metatypedev/metatype/pull/811">#811</a>)
</summary>

User side of substantial

#### Migration notes

None

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Add caching to Secrets struct to improve performance (<a href="https://github.com/metatypedev/metatype/pull/813">#813</a>)
</summary>

#### Migration notes

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Refactor

<details >
<summary>
(docs, gate) Push for `meta dev` instead of `meta typegate` on docs (<a href="https://github.com/metatypedev/metatype/pull/822">#822</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

## Ensure documentation is pushing for meta dev instead of meta typegate
- [x] add a warning that envs are not set.

<!-- 2. Explain WHY the change cannot be made simpler -->


[MET-635](https://linear.app/metatypedev/issue/MET-635/cli-ensure-documentation-is-pushing-for-meta-dev-instead-of-meta)

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

_No Migration Needed_

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Flatten deps and improve repo folder (<a href="https://github.com/metatypedev/metatype/pull/821">#821</a>)
</summary>

- Renames `libs/` to `src/`.
- Moves `typegate/`, `meta-cli`, `typegraph/`, `meta-lsp/` to `src/`.
- Renames `dev/` to `tools/`
- Moves `website/` to `docs/metatype.dev`/
- Moves `src/typegate/tests` to `tests/`
- Moves `src/typegraph/deno/dev` to `tools/jsr/`
- Moves `src/typegraph/deno/sdk` to `src/typegraph/deno/`
- Renames `src/deno` to `src/mt_deno`
- Bumps deno to `1.46.1`
- Bumps rust toolchain to `1.80.1`
- Moves all rust dependencies to workspace section
- Moves `tools/task-*.ts` to `tools/task/*.ts`
- Moves `cliff.toml`, `Cross.toml`, `ruff.toml` to `tools/`
- Uses deno
[workspaces](https://docs.deno.com/runtime/manual/basics/workspaces/) to
organize `src/typegraph/deno`, `src/typegate`, `tools/`, `tests/` and
more.
- Closes MET-607
- Updates poetry to 1.8.3
- Bumps metatype to version 0.4.9-rc1
- [x] Update CONTRIBUTING.md
- [x] Fix CI workflows
- [x] Fix Dockerfile
- [x] Fix all tests

#### Migration notes

- No end user changes required

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>


## [v0.4.8](https://github.com/metatypedev/metatype/releases/tag/v0.4.8) - 2024-08-16

### Bug Fixes

<details >
<summary>
Table method for kv runtime (<a href="https://github.com/metatypedev/metatype/pull/815">#815</a>)
</summary>

I discover an issue in the KV runtime documentation 
[kvruntime docs](https://metatype.dev/docs/reference/runtimes/kv)

</details>
<details >
<summary>
`wasm_backtrace` config bug (<a href="https://github.com/metatypedev/metatype/pull/814">#814</a>)
</summary>

- `$WASM_BACKTRACE_DETAILS` was enabled in `main` ghjk env which
affected embedded wasm module compilation to have backtrace enabled.
This broke typegate runs without the flag enabled due to mismatch.
- Fixes Cargo.lock not being used in Dockerfile.
- Prepare 0.4.8 release

</details>


### Features

<details >
<summary>
Kv runtime (<a href="https://github.com/metatypedev/metatype/pull/797">#797</a>)
</summary>

#### Migration notes

...

- [x] The change comes with new or modified tests
- [x] End-user documentation is updated to reflect the change
- [ ] Hard-to-understand functions have explanatory comments

</details>


### Miscellaneous Tasks

<details >
<summary>
Bump to 0.4.8-0 (<a href="https://github.com/metatypedev/metatype/pull/810">#810</a>)
</summary>

- Bump prerelease
- Fix minor issue with release pipeline

</details>


## [v0.4.7](https://github.com/metatypedev/metatype/releases/tag/v0.4.7) - 2024-08-08

### Features

<details >
<summary>
(cli) Fix auto deployment (<a href="https://github.com/metatypedev/metatype/pull/806">#806</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Upgrade lade-sdk
- Fix discovery
- Remove obsolete dep: actix-web

<!-- 2. Explain WHY the change cannot be made simpler -->

- `lade-sdk` uses the main branch, which now has the fix for the
following issues:
- dependency version conflict with
[deno](https://github.com/metatypedev/deno/blob/691f297537c4a3d9a12ce005c0478b4aee86287c/Cargo.toml#L179):
`url` is set at `<2.5.0`;
- required ProjectID error for infisical: the project id is added
explicitly on the command.

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Cors headers on error (<a href="https://github.com/metatypedev/metatype/pull/803">#803</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

-

<!-- 2. Explain WHY the change cannot be made simpler -->

-

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Miscellaneous Tasks

<details >
<summary>
Bump to 0.4.7-0 (<a href="https://github.com/metatypedev/metatype/pull/805">#805</a>)
</summary>

- Bump version to 0.4.7-0

</details>


### Refactor

<details >
<summary>
(docs) Add how to test typegraphs doc (<a href="https://github.com/metatypedev/metatype/pull/798">#798</a>)
</summary>

# `How to test your typegraphs` documentation

<!-- 1. Explain WHAT the change is about -->

- [x] add python doc
- [x] add ts doc
- [x] upgrade bitnami/minIo image to 2024?

#### Migration notes

_No Migrations Needed_

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Updated the Minio service to the latest version for improved
performance and potential new features.
- Introduced comprehensive documentation for testing typegraphs in both
TypeScript and Python, enhancing developer experience.

- **Documentation**
  - Enhanced readability of the `Meta CLI` upgrade instructions.
- Reformatted installation instructions for the `typegraph` package for
better clarity.

- **Chores**
- Updated dependency management configuration for improved compatibility
and performance across different platforms.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Improve JSR score (part 1) (<a href="https://github.com/metatypedev/metatype/pull/807">#807</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Add symbol documentations
- Fix slow types

<!-- 2. Explain WHY the change cannot be made simpler -->

-

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


## [v0.4.6](https://github.com/metatypedev/metatype/releases/tag/v0.4.6) - 2024-08-01

### Features

<details >
<summary>
Better arg split logic for MCLI_LOADER (<a href="https://github.com/metatypedev/metatype/pull/799">#799</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

-

<!-- 2. Explain WHY the change cannot be made simpler -->

-

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Miscellaneous Tasks

<details >
<summary>
Prepare 0.4.6 (<a href="https://github.com/metatypedev/metatype/pull/795">#795</a>)
</summary>

- Bump version to 0.4.6-0
- Add sanity tests for published SDKs
- Bump deno to 1.45.2
- Bump rust to 1.79.0
- Fix myriad of bugs

#### Migration notes

...

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Introduced new logging capabilities in the `ConnectedEngine` with
adjustable logging levels.
- Implemented cleanup procedures in tests to enhance resource
management.

- **Bug Fixes**
- Fixed import paths for permissions to ensure correct functionality in
tests and applications.

- **Version Updates**
- Incremented version numbers across multiple projects and packages to
reflect ongoing development and improvements.
  
- **Documentation**
- Added comments to clarify code behavior and potential future
considerations in various modules.

- **Refactor**
- Optimized string handling in several functions and adjusted method
signatures for improved clarity and efficiency.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


### Refactor

<details >
<summary>
(docs) Better documentation on `quick-start` page (<a href="https://github.com/metatypedev/metatype/pull/793">#793</a>)
</summary>

## Improve the documentation on `quick-start` page

- [x] add dev hunt result to homepage.


<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

-

<!-- 2. Explain WHY the change cannot be made simpler -->

-

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


## [v0.4.5](https://github.com/metatypedev/metatype/releases/tag/v0.4.5) - 2024-07-18

### Bug Fixes

<details >
<summary>
Broken pipeline for 0.4.4 (<a href="https://github.com/metatypedev/metatype/pull/782">#782</a>)
</summary>

Fixes erroneous usage of `setup-deno` which has been replaced by `ghjk`
itself.

#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Broken release pipeline 2 (<a href="https://github.com/metatypedev/metatype/pull/783">#783</a>)
</summary>

Fix issue with the three remaining failing jobs.

#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Release pipeline 3 (<a href="https://github.com/metatypedev/metatype/pull/784">#784</a>)
</summary>

- Remove accidental dry-run from jsr publish
- Fix cross dockerfile

#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Skip deno stack trace from error message (<a href="https://github.com/metatypedev/metatype/pull/787">#787</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

Skip the deno stack trace from the error message when tg_manage fails.

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

_N/A_

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Features

<details open>
<summary>
(cli) Configurable backoff (<a href="https://github.com/metatypedev/metatype/pull/789">#789</a>)
  - BREAKING: configurable backoff (<a href="https://github.com/metatypedev/metatype/pull/789">#789</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Make the backoff configurable through the `--retry` and
`--retry-interval-ms` options.
- The default max retry count is changed to 0 on the default mode, and
remains 3 on the watch mode.
- The `--max-parallel-loads` option has been renamed to `--threads`.

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

The `--max-parallel-loads` option has been renamed to `--threads`.

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Add list subcommand features to meta_cli (<a href="https://github.com/metatypedev/metatype/pull/775">#775</a>)
</summary>

new branch after conflict with main branch

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

-

<!-- 2. Explain WHY the change cannot be made simpler -->

-

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Upgrade www and gha (<a href="https://github.com/metatypedev/metatype/pull/786">#786</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

</details>
<details >
<summary>
Add back gleap (<a href="https://github.com/metatypedev/metatype/pull/791">#791</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Gleap.io was removed a while back
- this adds it back so visitors can open ticket and suggest feedback
- internally, we will use this to fine tune the documentation

</details>


### Miscellaneous Tasks

<details >
<summary>
Bump v0.4.5 (<a href="https://github.com/metatypedev/metatype/pull/792">#792</a>)
</summary>

- Bumps metatype version to 0.4.5
- Bumps ghjk to latest commit
- Fixes `setup` whiz task to avoid issues on macos
- Fixes release pipeline to publish JSR

MET-614 MET-606 MET-605 MET-613

#### Migration notes

_No changes required._

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


## [v0.4.4](https://github.com/metatypedev/metatype/releases/tag/v0.4.4) - 2024-07-05

### Bug Fixes

<details >
<summary>
(gate) Ensure all deps are defined in import_map.json (<a href="https://github.com/metatypedev/metatype/pull/768">#768</a>)
</summary>

Ensure that all deps are defined in `import_map.json` with a specific
version.

</details>
<details >
<summary>
Missing typegraphs (<a href="https://github.com/metatypedev/metatype/pull/755">#755</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- fix the typegraphs that were incorrectly formatted

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->



- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Stable formatting and uniformize the code-loader (<a href="https://github.com/metatypedev/metatype/pull/766">#766</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- add prettier to avoid doc formatting issue
- now explicitly require `!!code-loader!` to load code inside the
documentation (will hopefully help also with the missing typegraphs
issues, still under investigation)

<!-- 2. Explain WHY the change cannot be made simpler -->

<!-- 3. Explain HOW users should update their code -->



- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>


### Documentation

<details >
<summary>
Generate clients from openapi (<a href="https://github.com/metatypedev/metatype/pull/778">#778</a>)
</summary>

Demonstrate how to use the openapi spec to generate clients in most
languages/frameworks.

#### Migration notes

None

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **Documentation**
- Updated REST API documentation URLs with placeholders for easier
configuration.
- Added information on generating and using OpenAPI clients, including
TypeScript fetch client generation.
- **Bug Fixes**
- Corrected a regular expression in import handling to ensure accurate
replacements.
- **Chores**
- Improved file writing by appending a newline character to JSON
strings.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


### Features

<details >
<summary>
Move all the configs to one single file (<a href="https://github.com/metatypedev/metatype/pull/733">#733</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Move all the configs to one single file
- Remove some specific configs from the global config variable and make
them accessible on the `Typegate` instance, to improve test
configurability.

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

- `SYNC_REDIS_PASSWORD` has been removed, can only be set on the
`SYNC_REDIS_URL`.


- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Remove restrictions for union/either types (<a href="https://github.com/metatypedev/metatype/pull/761">#761</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

In the previous versions, we restricted the variant types allowed in
union/either to be all in the same category (after flattening
multi-level unions):
- *Category 1* - **GraphQL leaf types**: scalar type, or array of scalar
type, which require no selection set on GraphQL.
- *Category 2* - **GraphQL non-leaf types**: object type or array of
object type, which require a selection set on GraphQL (aka selectable
types in the codebase).

Those restrictions can be lifted, and the selection field of an
union-type field will have inline fragments with type conditions for
each *Category 2* variant. No type condition is required for *Category
1* types, the selection sets are not relevant.

The case that is not handled by this PR is when one of the variants is
an array of union type.


<!-- 3. Explain HOW users should update their code -->

#### Migration notes

_N/A_

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Typegate in meta dev, upgrade test (<a href="https://github.com/metatypedev/metatype/pull/776">#776</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Test the typegate upgrade from the latest published version to the
current version.
- Add a flag to run an instance of the typegate with the target
configuration (port, admin passsword) to `meta deploy`, enabled by
default for `meta dev`.

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

If you have a script that runs `meta dev`, add the flag `--no-typegate`
if you already have a typegate.

- [x] The change comes with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>


### Miscellaneous Tasks

<details >
<summary>
Add programmatic deploy tests (<a href="https://github.com/metatypedev/metatype/pull/769">#769</a>)
</summary>

## Add Programmatic deploy tests for the docs

- [x] Add programmatic typegraph deploy/remove tests
- [x] refactor tg_remove to accept `typegraph_name` instead of
`TypegraphOutput` obj.

<!-- 1. Explain WHAT the change is about -->


[MET-591](https://linear.app/metatypedev/issue/MET-591/docstest-test-example-script-for-tg-deploy)

<!-- 2. Explain WHY the change cannot be made simpler -->

-

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

_No Migrations Needed_

...

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Bump to version 0.4.4 (<a href="https://github.com/metatypedev/metatype/pull/779">#779</a>)
</summary>

Prepare release of the 0.4.4 version.

#### Migration notes

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Refactor

<details open>
<summary>
(sdk) Back to deno + jsr exploration (<a href="https://github.com/metatypedev/metatype/pull/760">#760</a>)
  - BREAKING: back to deno + jsr exploration (<a href="https://github.com/metatypedev/metatype/pull/760">#760</a>)
</summary>

Try reverting back to deno runtime for the typescript sdk in hope of
making the dx easier.
Hosting a custom node/npm project adds more layer of indirection which
may result in cryptic issues sometimes.

This should also facilitate publishing on jsr although additional work
are still required on the `jco` codegen side.

#### Migration notes

N/A

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Move to ghjk 0.2.0 (<a href="https://github.com/metatypedev/metatype/pull/754">#754</a>)
</summary>

- Refactors the ghjk.ts, CI to the latest version of ghjk
- Bumps version to 0.4.4-0
- Fixes race bug in python_sync tests
- Fixes flakeout of wasm `build.sh` scripts due to wasm-tools EOF issue
- #763 
- #746 

#### Migration notes

- [ ] The change comes with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **Chores**
- Updated GitHub Actions workflows to use the latest version of
`metatypedev/setup-ghjk` for improved stability and performance.
- Modified `GHJK_VERSION` and various environment variables across
multiple configuration files to ensure compatibility with updated
dependencies.
- Revised Dockerfiles to streamline environment setup and improve build
efficiency.
- Updated dependency management in `pyproject.toml` for better security
and performance.
  - Enhanced logging and error handling in test scripts.

These updates collectively optimize the development environment,
ensuring smoother builds and more reliable workflows.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>


### Testing

<details >
<summary>
(full) Update test runner (<a href="https://github.com/metatypedev/metatype/pull/705">#705</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain below WHAT the change is -->

New test runner, by default:
- Less verbose
- No output for successful tests

Parallel tests re-enabled.

<!-- 2. Explain below WHY the change cannot be made simpler -->


<!-- 3. Explain below WHY the was made or link an issue number -->



<!-- 4. Explain HOW users should update their code or remove that
section -->

#### Migration notes

_N/A_

<!-- 5. Readiness checklist
- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change
-->

</details>


## [v0.4.3](https://github.com/metatypedev/metatype/releases/tag/v0.4.3) - 2024-06-22

### Bug Fixes

<details >
<summary>
(ci) Poetry lockfile (<a href="https://github.com/metatypedev/metatype/pull/732">#732</a>)
</summary>

- Fixes poetry lockfile and adds pre-commit hook to prevent issue from
happening

</details>
<details >
<summary>
(docs) Fix demo typegraphs 2 (<a href="https://github.com/metatypedev/metatype/pull/756">#756</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

Fix example typegraphs on metatype.dev.
- [x] reduce.ts
- [x] policies.ts
- [x] graphql.ts
- [x] authentication.ts

<!-- 1. Explain WHAT the change is about -->


[MET_574](https://linear.app/metatypedev/issue/MET-574/docs-fix-demo-typegraphs-2)

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

_No Migrations Needed_

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(docs) Fix programmatic deployment guides (<a href="https://github.com/metatypedev/metatype/pull/762">#762</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

- [x] Fix typo
- [x] fix/test tg deploy
- [x] fix/test tg remove

<!-- 1. Explain WHAT the change is about -->


[MET-587](https://linear.app/metatypedev/issue/MET-587/docs-fix-programmatic-deployment-guides)

<!-- 2. Explain WHY the change cannot be made simpler -->

-

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

_No Migration Needed_

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Only build xtask once for the tests (<a href="https://github.com/metatypedev/metatype/pull/720">#720</a>)
</summary>

Use the xtask binary to run the tests.

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
  - Updated platform compatibility to `x86_64-linux`.
- Added new configuration entry for enhanced versioning and platform
support.

- **Improvements**
- Modified test script to use a custom build script for better test
management.

These changes improve platform compatibility and streamline the testing
process.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>
<details >
<summary>
Missing typegraphs (<a href="https://github.com/metatypedev/metatype/pull/741">#741</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->
**Fix Missing Typegraphs**

<!-- 1. Explain WHAT the change is about -->

- attempt to fix the missing typegraphs on metatype.dev.

<!-- 2. Explain WHY the change cannot be made simpler -->

-
[MET-563](https://linear.app/metatypedev/issue/MET-563/docs-complete-missing-typegraphs)

<!-- 3. Explain HOW users should update their code -->

#### Migration notes
_No Migrations Needed_
...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Upload url path and add logging in the SDK (<a href="https://github.com/metatypedev/metatype/pull/740">#740</a>)
</summary>

- Fix upload url: prepare-upload returns upload tokens instead of upload
urls
- Add logging in the typegraph SDK
- Refactor the actor system in the CLI
- Use jsonrpc for communication between the CLI and typegraph processes
(over stdin/stdout)

#### Migration notes

- The `typegraphs.deno` section of the `metatype.yaml` config file has
been replaced by `typegraphs.typescript` and `typegraphs.javascript`.
- `tg_deploy` params has changed.


- [x] The change comes with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Failed typegraph deployment (<a href="https://github.com/metatypedev/metatype/pull/758">#758</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Fix casing typo in the typescript sdk
- Fix error reporting in the typescript sdk
- Display the retry number
- Warning on cancelled retry

<!-- 2. Explain WHY the change cannot be made simpler -->

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

N/A

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Documentation

<details >
<summary>
`/docs/concepts/features-overview/` (<a href="https://github.com/metatypedev/metatype/pull/725">#725</a>)
</summary>

- Re-does the feature overview page of the documentation.

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Added a "Features Roadmap" component to the website, displaying a list
of features with details and links.

- **Documentation**
- Updated various guides and reference documents to improve clarity and
presentation of code examples.
- Added new sections for various features such as Typegate, Typegraph,
Runtimes, Prisma, Auth, Tooling, and SDK.

- **Bug Fixes**
  - Corrected a typo in the GraphQL runtimes reference documentation.

- **Refactor**
- Replaced `SDKTabs` and `TabItem` components with `TGExample` for
better code example presentation.
- Adjusted the `MiniQL` component to handle optional properties and
default settings.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>
<details >
<summary>
`/docs/reference/metagen` + `/docs/guides/wasm-functions` (<a href="https://github.com/metatypedev/metatype/pull/751">#751</a>)
</summary>

- Adds `/docs/reference/metagen`
- Adds `/docs/guides/wasm-functions`
- Adds a codegen section to `/docs/guides/external-functions`

MDK-492.

#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Added new targets for `metagen` with different generators and paths
for TypeScript, Python, and Rust.
- Introduced new functionality for defining and exposing typegraphs with
policies in various environments (Deno, Python, Rust).
- Added automated Rust WebAssembly project generation and compilation
script.
- Enhanced documentation with new sections and updated code examples
using `TGExample`.

- **Bug Fixes**
  - Updated `.gitignore` to exclude `*.wasm` files.

- **Documentation**
- Updated links and added detailed instructions for generating types
using `metagen`.

- **Refactor**
- Switched from `HashMap` to `BTreeMap` and `HashSet` to `BTreeSet` in
various modules for better data structure handling.
  - Added logging enhancements in the `Typegate` class.

- **Chores**
  - Updated build script for Rust WebAssembly target.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Programmatic deployment blogpost (<a href="https://github.com/metatypedev/metatype/pull/752">#752</a>)
</summary>

Blogpost to help discover programmatic deployment additions.


#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Introduced programmatic deployment feature for deploying typegraphs
within the Metatype ecosystem using TypeScript/Python SDKs.
- Added new configuration options and deployment functions to enhance
automation and flexibility in deployment processes.

- **Documentation**
- Added a new blog post detailing the programmatic deployment feature
and its usage.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


### Features

<details >
<summary>
(SDK) Add `globs` and `dir` support for artifact deps. (<a href="https://github.com/metatypedev/metatype/pull/698">#698</a>)
</summary>

- [x] Include glob and dir support for `PythonRuntime` deps.
- [x] Include glob and dir support for `DenoRuntime` deps.
- [x] add tests

The change includes support for declaring artifact dependencies through
`globs` and `dirs`

<!-- 2. Explain below WHY the change cannot be made simpler -->


<!-- 3. Explain below WHY the was made or link an issue number -->


[MET-441](https://linear.app/metatypedev/issue/MET-441/sdk-support-globs-and-directories-in-artifact-dependencies)

<!-- 4. Explain HOW users should update their code or remove that
section -->

#### Migration notes

In the `deps` parameter for `python.import(...)` and `deno.import(...)`,
globs and dirs can be passed in addition to files.


- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change



<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Introduced functionality for defining and deploying Typegraphs for
Deno and Python runtimes.
- Added support for defining a Deno runtime dependency graph with
policies for test scenarios.

- **Bug Fixes**
- Corrected the structure of the `Deno.serve` call in the `serve`
function.

- **Refactor**
- Enhanced method chaining for better readability in the `MetaTest`
class.

- **Tests**
- Updated test coverage reporting to include new Deno runtime test
files.
  - Commented out and removed outdated test cases in Deno runtime tests.

- **Chores**
  - Updated platform specification in configuration files.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>
<details >
<summary>
(docs) Add `embedded typegate` page (<a href="https://github.com/metatypedev/metatype/pull/747">#747</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->
# Embedded typegate docs page

- [x] need a page under meta-cli/embedded typegate to explain how that
works
- [x] tutorials should take advantage of the embedded one
- [x] the embedded one should be the default everything
- [x] explain that there is 2 flavors in reference/meta-cli


[MET-562](https://linear.app/metatypedev/issue/MET-562/docs-use-embedded-whenever-possible-in-the-docs-and-examples)

<!-- 1. Explain WHAT the change is about -->

-

<!-- 2. Explain WHY the change cannot be made simpler -->

-

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

_No Migrations Needed_
...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(mdk) Mdk python (<a href="https://github.com/metatypedev/metatype/pull/707">#707</a>)
</summary>

Mdk for python runtime

#### Migration notes

None

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Introduced new functionalities for generating Python code based on
configurations, including handling of templates and required objects.
- Added Python script templates for defining typed functions and
structured objects with comprehensive data type handling.
	- Enhanced type management and priority handling in utility functions.

- **Documentation**
- Provided detailed summaries and documentation for new functionalities
and templates.

- **Refactor**
- Implemented new structures and methods for efficient code generation
and type handling.

- **Tests**
	- Added tests for defining typegraph structures and policies in Python.

- **Chores**
- Updated URLs in the `.ghjk/deno.lock` file to reflect new changes in
the codebase.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>
<details open>
<summary>
(mdk) `mdk_typescript` (<a href="https://github.com/metatypedev/metatype/pull/739">#739</a>)
  - BREAKING: `mdk_typescript` (<a href="https://github.com/metatypedev/metatype/pull/739">#739</a>)
</summary>

- Implements the `mdk_typescript` code generator for typescript type
inference on Deno runtime external modules.
- Ports the very simple generator already present in meta-cli.
- Removes old codegen from cli and sdk.

#### Migration notes

- Metagen section of `metatype.yaml` has changed. Targets are now lists
instead of maps, items no sporting `generator` field instead of key
acting as ref to generator.
- (sdk) WasmRuntime's `fromExport` method has been renamed to `export`
to make it more uniform to handler.
- (sdk) WasmRuntime `export` and `handler` method's now expect
handler/func name under `name` instead of `func`.
- (sdk) `codegen` flag has been removed from `ArtifactsConfig` object.
- (cli) `gen mod/mdk` has been simplified to just `gen` as the previous
mod option is no longer avail.

---

- [x] The change comes with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(mdk,gate) Hostcall (<a href="https://github.com/metatypedev/metatype/pull/706">#706</a>)
</summary>

Introduces a mechanism for wasm materializers to access hostgate
functions.

This implements a pretty basic JSON wire interface, a singular
`hostcall` function that's exposed to materializers. The only
implemented function on this interface are `gql` queries.

This is a stacked PR on top of #687.

MET-473.

- [x] The change come with new or modified tests

<!-- 5. Readiness checklist
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change
-->


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Added an import statement for `std_url` and a new task for installing
WASI adapter related files.
- Introduced new functionalities in the application's runtime to support
additional parameters and error handling.

- **Enhancements**
- Improved the application's handling of GraphQL queries with new error
types and display methods.
- Enhanced the WASM runtime build process to target a more appropriate
architecture.

- **Bug Fixes**
- Fixed issues in Python and WASM runtime tests to ensure reliability
and performance.

- **Documentation**
- Updated internal documentation to reflect new command interfaces and
environmental interactions in the application's CLI tools.

- **Refactor**
- Refactored various internal APIs to improve code maintainability and
efficiency.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>
<details >
<summary>
(meta-test) Update `t.engine()` impl (<a href="https://github.com/metatypedev/metatype/pull/716">#716</a>)
</summary>

Update the implementation of `t.engine()`

<!-- 1. Explain below WHAT the change is -->

The change comes with removing the different spin-offs of `t.engine`
which arose from the previous impl of t.engine incompatibility with
artifact upload protocol. The change will make `t.engine` deploy the
artifacts in Artifact Resolution mode by running a shell command to
deploy the typegraph.

<!-- 2. Explain below WHY the change cannot be made simpler -->

...

<!-- 3. Explain below WHY the was made or link an issue number -->


[MET-500](https://linear.app/metatypedev/issue/MET-500/test-update-the-implementation-of-tengine)

<!-- 4. Explain HOW users should update their code or remove that
section -->

- [x] remove different versions of `t.engine`
- [x] add tg_deploy caller script which imports typegraphs dynamically
and deploys them.
- [x] make changes to make `t.engine` run in artifact resolution mode 
- [x] update existing tests to adhere to the current change
- [x] pass unique different `tempDir`s to all the typegate instances
created during test.
- [x] add support for authoring multiple typegraphs in a single file in
`meta-test` and add multi typegraph tests.

#### Migration notes

python SDK test typegraphs' function names should be the same with the
filename of the typegraph file, for dynamic import compatibility
reasons.

<!-- 5. Readiness checklist
- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change
-->


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Introduced a new function `wasm_duplicate` to handle WebAssembly
runtimes with specific policies.

- **Refactor**
- Renamed and refactored functions and test setups to align with updated
test frameworks and improve code clarity.

- **Bug Fixes**
- Added error handling in the `getLocalPath` function to log warnings if
linking errors occur.

- **Tests**
- Updated test scripts to reflect changes in function calls, imports,
and engine instantiation for better test accuracy and reliability.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Doc polish (<a href="https://github.com/metatypedev/metatype/pull/735">#735</a>)
</summary>

- doc polish and cleanup
- upgrade website except Docusaurus as the css issue is stil present
- bump to next pre-release
- not everything is done, but let's iterate!



<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
  - Added platform compatibility for `x86_64-linux`.
- Introduced new functionalities for generating Python code and enhanced
type management.
- Added import statement for `std_url` and new task for installing WASI
adapter files.
- Enhanced runtime support for additional parameters and error handling.

- **Improvements**
- Enhanced GraphQL query handling with new error types and display
methods.
- Improved WASM runtime build process for better architecture targeting.

- **Documentation**
  - Updated feature overview and added a "Features Roadmap" component.
  - Enhanced various guides and references for better clarity.
- Added new sections for Typegate, Typegraph, Runtimes, Prisma, Auth,
Tooling, and SDK.
  - Corrected typos and improved code example presentation.

- **Bug Fixes**
  - Fixed issues in Python and WASM runtime tests to ensure reliability.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>


### Miscellaneous Tasks

<details >
<summary>
(docs) Replace term materializer with function for user facing concepts (<a href="https://github.com/metatypedev/metatype/pull/736">#736</a>)
</summary>

Materializer and function might introduce confusion as they are pretty
much the same thing from the user point of view, one can be defined in
terms of the other.

#### Migration notes

None

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **Documentation**
- Updated terminology from "materializers" to "functions" across various
documentation files to reflect a semantic shift and provide clearer
descriptions.
- Improved clarity in descriptions of custom functions, runtimes, and
their roles in the Metatype computing model.
- Corrected typos and refined explanations in multiple guides and
reference documents.

These changes enhance the readability and consistency of our
documentation, making it easier for users to understand and implement
the features and concepts within the system.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
(docs) Embedded typegate (v0.3.x) blog (<a href="https://github.com/metatypedev/metatype/pull/750">#750</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

# Add a blog about Embedded Typegate.

<!-- 1. Explain WHAT the change is about -->


[MET-564](https://linear.app/metatypedev/issue/MET-564/docs-embedded-typegate-v03x)

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

_No Migrations Needed_

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Introduced a new blog post on emulating server nodes locally using the
Embedded Typegate feature in Meta CLI.
- Added a new `BlogIntro` component to the website for displaying styled
blog introductions.

- **Documentation**
- Updated documentation to explain how to spin up a local instance of
Typegate for testing and development.

- **Chores**
- Updated platform compatibility from "x86_64-linux" to
"aarch64-darwin".

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
(website) `g.rest` reference at `/docs/reference/rest` (<a href="https://github.com/metatypedev/metatype/pull/734">#734</a>)
</summary>

Add reference page for `g.rest(..)`

#### Migration notes

None

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **Documentation**
  - Added a reference to the REST reference section in the REST guide.
  - Introduced new documentation for consuming APIs using Metatype.
- Included examples in Python and TypeScript for interacting with REST
APIs.
  - Explained query types, dynamic queries, and endpoint access.
- Provided guidance on accessing auto-generated documentation and
downloading the OpenAPI spec.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>
<details >
<summary>
Bump deno to 1.43.6 (<a href="https://github.com/metatypedev/metatype/pull/737">#737</a>)
</summary>

Update deno to 1.43.6 and make requisite changes.

Required because of dep conflicts with latest lade-sdk.

#### Migration notes

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Update `rust` dependencies (<a href="https://github.com/metatypedev/metatype/pull/748">#748</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

update Rust dependencies

<!-- 2. Explain WHY the change cannot be made simpler -->


[MET-479](https://linear.app/metatypedev/issue/MET-479/sdkgate-update-rust-dependencies)

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

_No Migrations Needed_

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Bump `METATYPE_VERSION` to 0.4.3 (<a href="https://github.com/metatypedev/metatype/pull/764">#764</a>)
</summary>



</details>


## [v0.4.2](https://github.com/metatypedev/metatype/releases/tag/v0.4.2) - 2024-05-22

### Bug Fixes

<details >
<summary>
(release) Fix fat CLI compilation (<a href="https://github.com/metatypedev/metatype/pull/730">#730</a>)
</summary>

- Fix fat CLI compilation
- Bump to 0.4.2
- Bump wasmtime to 21
- Bump rust to 1.78.0



- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>


## [v0.4.1](https://github.com/metatypedev/metatype/releases/tag/v0.4.1) - 2024-05-20

### Bug Fixes

<details >
<summary>
(SDK) Artifact upload fails when same file referred multiple times (<a href="https://github.com/metatypedev/metatype/pull/715">#715</a>)
</summary>

- [x] fix the bug where duplicate artifact references causing failure
during artifact resolution(typegate) during runtime.
- [x] add sync mode tests for Python and Deno runtime.
- [x] add other edge test cases to artifact upload.
    - [x] test for no artifact in typegraph
    - [x] test for duplicate artifact reference in the same typegraph

</details>
<details >
<summary>
(gate) Improve logging and responses, prepare 0.4.1 (<a href="https://github.com/metatypedev/metatype/pull/714">#714</a>)
</summary>

- Logging before and after each faillible operation
  -  Runtimes: foreign resolvers
- Always log before reporting error: HTTP response
- Fix error code in artifact_service
- Add `BaseError` class for structured messages in responses

<!-- 5. Readiness checklist
- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change
-->


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Updated Docker image versions and dependency versions to ensure
compatibility and stability.
  - Added a search functionality to the app.

- **Bug Fixes**
- Enhanced error handling with specific error classes for more detailed
error messages.

- **Refactor**
- Replaced generic `Error` instances with specific error classes for
better error categorization.
- Refactored error handling in HTTP response functions to use a
`BaseError` class.

- **Chores**
- Updated version numbers across multiple configuration files to
`0.4.1-0`.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>


### Features

<details >
<summary>
Polish documentation and project (<a href="https://github.com/metatypedev/metatype/pull/696">#696</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain below WHAT the change is -->

- update the headline, the overviews and many other documentation areas
- upgrades the dependencies.

<!-- 2. Explain below WHY the change cannot be made simpler -->


<!-- 4. Explain HOW users should update their code or remove that
section -->

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit


- **Bug Fixes**
- Updated Docker image version for the `typegate` service to ensure
stability and compatibility.

- **Documentation**
- Revised `TAGLINE` for better clarity on supported languages: WASM,
Typescript, and Python.
- Updated version declarations for improved consistency and
functionality across multiple files.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>


### Miscellaneous Tasks

<details >
<summary>
(docs) Final polish to comparison table. (<a href="https://github.com/metatypedev/metatype/pull/709">#709</a>)
</summary>

some changes to comparison table(docs)

#### Migration notes

_No Migrations Needed_

<!-- 5. Readiness checklist
- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change
-->


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit


- **Documentation**
- Introduced a new section on Artifact Tracking Protocol in the
architecture documentation, explaining artifact classification and
tracking modes in Metatype.
- Updated comparisons documentation with additional platforms, criteria
for choosing Metatype, and detailed feature comparison tables.
- Renamed project directory for clarity and consistency in project setup
documentation.
- **Bug Fixes**
  - Removed outdated `TODO` comment in installation documentation.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Bump to version 0.4.1-0 (<a href="https://github.com/metatypedev/metatype/pull/713">#713</a>)
</summary>

- Bumps version to 0.4.1-0.
- Fixes broken release CI.
- #719
- Adds 20 minutes to test-full timeout.

<!-- 5. Readiness checklist
- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change
-->


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Summary by CodeRabbit

- **New Features**
- Updated platform support for better compatibility with "x86_64-linux".

- **Bug Fixes**
- Minor version updates across multiple configurations to enhance
stability.

- **Chores**
- Updated version numbers from "0.4.0" to "0.4.1-0" across various files
and configurations.

- **Refactor**
- Adjusted build and test scripts for improved efficiency and
compatibility.

- **Documentation**
- Enhanced internal documentation to reflect version and platform
changes.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>


## [v0.4.0](https://github.com/metatypedev/metatype/releases/tag/v0.4.0) - 2024-05-09

### Bug Fixes

<details >
<summary>
(ci) Fix broken nighly jobs (<a href="https://github.com/metatypedev/metatype/pull/659">#659</a>)
</summary>

Fixes the broken nightly builds. Look at solved results
[here](https://github.com/metatypedev/metatype/actions/runs/8533669013).

#### Motivation and context

Nightly builds were broken due to oversight during the #571 fixes.

#### Migration notes

__No changes required__

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(gh-tests) Fix local npm registry config (<a href="https://github.com/metatypedev/metatype/pull/692">#692</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain below WHAT the change is -->

Fix the NPM registry config in the Github tests.

<!-- 2. Explain below WHY the change cannot be made simpler -->

<!-- 3. Explain below WHY the was made or link an issue number -->

<!-- 4. Explain HOW users should update their code or remove that
section -->

#### Migration notes

_N/A_

<!-- 5. Readiness checklist
- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change
-->

</details>
<details >
<summary>
Set max log level based on verbose flag (<a href="https://github.com/metatypedev/metatype/pull/664">#664</a>)
</summary>

Set max log level based on verbose flag

#### Motivation and context


[MET-445](https://linear.app/metatypedev/issue/MET-445/cli-no-verboselogging-how-to-debug-this)

#### Migration notes

_n/a_

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Fix secret passing (<a href="https://github.com/metatypedev/metatype/pull/675">#675</a>)
</summary>

Fix secret passing in examples and documentation.

#### Motivation and context

Followup to #666.

#### Migration notes

_N/A_

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Website and headline (<a href="https://github.com/metatypedev/metatype/pull/691">#691</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

<!-- Explain WHAT the change is -->

#### Motivation and context

Fix the CSS issue introduced by docusaurus 3.2.0
(https://github.com/facebook/docusaurus/issues/10005). 3.2.1 should fix
it but the affected version maybe loaded by dependencies, so we will
have to wait a bit more.

<!-- Explain WHY the was made or link an issue number -->


<!-- Explain HOW users should update their code when required -->

### Checklist

- [ ] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Do not override log level when no verbosity flag is present (<a href="https://github.com/metatypedev/metatype/pull/694">#694</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain below WHAT the change is -->

Remove log level override by the verbosity flag when no flag is present.
It will default to the configured env_logger default level (or env
variable).

<!-- 2. Explain below WHY the change cannot be made simpler -->

...

<!-- 3. Explain below WHY the was made or link an issue number -->

The default log level became "error" after #664, and `RUST_LOG`
environment variable where ignored.

<!-- 4. Explain HOW users should update their code or remove that
section -->

#### Migration notes

_N/A_

<!-- 5. Readiness checklist
- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change
-->

</details>


### Documentation

<details >
<summary>
Start rebranding (<a href="https://github.com/metatypedev/metatype/pull/641">#641</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog and understand when they need to update his code and
how.
-->

<!-- Explain WHAT the change is -->

#### Motivation and context

Changing the intro.

<!-- Explain WHY the was made or link an issue number -->

#### Migration notes

None.

<!-- Explain HOW users should update their code when required -->

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Add `reference/programmatic-deployment/` (<a href="https://github.com/metatypedev/metatype/pull/686">#686</a>)
</summary>

#### Motivation and context

Add missing docs for `tgDeploy`, `tgRemove`

#### Migration notes

None

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Add  examples for each command (<a href="https://github.com/metatypedev/metatype/pull/684">#684</a>)
</summary>

#### Motivation and context

Getting started with `meta` cli should be easy

#### Migration notes

None

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Improve `/tutorials/quick-start` section. (<a href="https://github.com/metatypedev/metatype/pull/681">#681</a>)
</summary>

- [x] Improve Layout
- [x] Include a simple project.
- [x] Add the result/outputs to running CLI commands.
- [x] Remove Metatype cloud registration form.
- [x] Separate the CLI commands to separate code blocks
- [x] Add links to references and concepts.
- [x] Add playground.

#### Motivation and context

[Docs
Meta-task](https://linear.app/metatypedev/issue/MET-440/docs-meta-task)

#### Migration notes

_No Migration Needed_

### Checklist

- [x] Test the commands and the examples.
- [ ] The change come with new or modified tests

</details>
<details >
<summary>
Improve `/docs/tutorials/metatype-basics` (<a href="https://github.com/metatypedev/metatype/pull/688">#688</a>)
</summary>

Improve `/docs/tutorials/metatype-basics`

#### Motivation and context

[Docs
Meta-task](https://linear.app/metatypedev/issue/MET-440/docs-meta-task)

#### Migration notes

_No Migrations Needed_

### Checklist

- [ ] The change come with new or modified tests

</details>
<details >
<summary>
Improve `/reference/runtimes/` (<a href="https://github.com/metatypedev/metatype/pull/676">#676</a>)
</summary>

#### Motivation and context

Better documentation

#### Migration notes

N/A

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Improve `/guides/external-functions` (<a href="https://github.com/metatypedev/metatype/pull/677">#677</a>)
</summary>

- Improvements to the `/guides/external-functions` page.
- Adds a configuration file for git-town

#### Motivation and context

_N/A_

#### Migration notes

_N/A_

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Improve `docs/reference/types` (<a href="https://github.com/metatypedev/metatype/pull/685">#685</a>)
</summary>

Improves `docs/reference/types`

#### Motivation and context

_N/A_

#### Migration notes

_N/A_

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Add a comparison b/n metatype and other similar solutions/products. (<a href="https://github.com/metatypedev/metatype/pull/697">#697</a>)
</summary>

<!--
Pull requests are squash merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain below WHAT the change is -->
- Adds a comparison table between metatype and other similar services.
- Add artifact upload protocol to `Architecture` section in docs.

<!-- 2. Explain below WHY the change cannot be made simpler -->


<!-- 3. Explain below WHY the was made or link an issue number -->

[MET-443](https://linear.app/metatypedev/issue/MET-443/include-comparisons-with-other-products-similar-to-metatype)

<!-- 4. Explain HOW users should update their code or remove that
section -->

#### Migration notes
_No Migration Needed_

<!-- 5. Readiness checklist
- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change
-->

</details>


### Features

<details >
<summary>
(cli) Long running discovery (<a href="https://github.com/metatypedev/metatype/pull/599">#599</a>)
</summary>

Delegate serialize, deploy, undeploy, unpack work to SDK.

#### Motivation and context

Remove duplicate logic, thinking of cli as a convenience on top of the
SDK.

#### Migration notes

When meta cli is used, Migration files are unpacked/resolved relative to
the typegraph's path, not the process's `workdir`.

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
(cli) `meta gen` (<a href="https://github.com/metatypedev/metatype/pull/636">#636</a>)
</summary>

Adds a command to `meta-cli` to invoke metagen.

#### Motivation and context

MET-424

#### Migration notes

__No changes required__

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
(cli) Timeout loader process (<a href="https://github.com/metatypedev/metatype/pull/693">#693</a>)
</summary>



</details>
<details >
<summary>
(cli,sdk) Codegen command (<a href="https://github.com/metatypedev/metatype/pull/661">#661</a>)
</summary>

#### Motivation and context

Enable back `codegen` on current cli implementation.

#### Migration notes

None

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(cli,sdk) Better error messages (<a href="https://github.com/metatypedev/metatype/pull/689">#689</a>)
</summary>

#### Motivation and context

Make it more clear where failures happen

#### Migration notes

None

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details open>
<summary>
(gate) Wasmtime support (<a href="https://github.com/metatypedev/metatype/pull/669">#669</a>)
  - BREAKING: wasmtime support (<a href="https://github.com/metatypedev/metatype/pull/669">#669</a>)
</summary>

#### Motivation and context

Enable support for
[wit](https://github.com/WebAssembly/component-model/blob/main/design/mvp/WIT.md)
and facilitate readiness for the upcoming specs.

#### Migration notes
`#[wasmedge_bindgen]` are replaced by wit bindings.

In the old version we were restricted to`#[wasmedge_bindgen]`, which was
only available in Rust and unique to WasmEdge.
```rust
#[wasmedge_bindgen]
fn add(a: u32, b: u32) -> u32 {
   a + b
}
```

In the new implementation, wasm modules written in any language that
uses the `wit` interface are now natively supported within `typegate`.
```wit
// wit/example.wit
package example:host;
world host {
  export add: func(a: u32, b: u32) -> u32;
}
```
An implementation (eg. in Rust) may look like this..
```rust
// src/lib.rs
wit_bindgen::generate!({ world: "host" });
struct MyLib;
impl Guest for MyLib {
    fn add(a: u32, b: u32) -> u32 {
        a + b
    }
}
export!(MyLib);
```

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
(gate,cli) `$DENO_V8_FLAGS` (<a href="https://github.com/metatypedev/metatype/pull/647">#647</a>)
</summary>

Enables the `DENO_V8_FLAGS` env var for tuning v8.

#### Motivation and context

MET-435 or #621 

#### Migration notes

- This just exposes the deno paramter directly. Refer to deno or v8 docs
for more details.

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(metagen) Metagen mdk rust (<a href="https://github.com/metatypedev/metatype/pull/624">#624</a>)
</summary>

Implements the general framework for metagen including a generator for
rust based wasm mat functions modules.

#### Motivation and context

MET-420

#### Migration notes

__No breaking changes__

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(sdk) .tgignore file support (<a href="https://github.com/metatypedev/metatype/pull/633">#633</a>)
</summary>

#### Motivation and context

Set what files/folders should be ignored when using the custom
`expand_path` function in an external `.tgignore` file.
`.tgignore` will behave similarly to most .ignore files with basic glob
syntax support.

#### Migration notes

`expand_glob` has been renamed to `expand_path`

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
(sdk) Introduce flag for disabling hashing artifacts + move hash to rust (<a href="https://github.com/metatypedev/metatype/pull/645">#645</a>)
</summary>

#### Motivation and context

The mdk codegen and typegraph mutually depends on each other (typegraph
needs a concrete mdk.wasm for hashing, and for the mdk.wasm to be built,
it needs type generation based on the typegraph)
Add a flag to enable processing a partial typegraph when using `meta
gen` (partial == no artifact resolution).

#### Migration notes

`get_file_hash` has been moved to core sdk (under the name `hash_file`)

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
(sdk, gate, cli) Upload protocol poc  uploading wasm file for `WasmEdge Runtime` for single replica mode (<a href="https://github.com/metatypedev/metatype/pull/631">#631</a>)
</summary>

Upload protocol for wasm files and atrifacts for `WasmEdge Runtime` for
single replica mode

#### Motivation and context

- Upload WasmEdge Runtime artifacts during typegraph deploy
- Access and load WasmEdge Runtime artifacts from the local file system
from typegate

#### Migration notes

*No Migrations Needed*

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Raw prisma query through the typegate runtime (<a href="https://github.com/metatypedev/metatype/pull/634">#634</a>)
</summary>

- Enable prisma query execution through the typegate runtime

#### Motivation and context

Console.

#### Migration notes

_N/A_

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details open>
<summary>
Store the typegraph on s3 (<a href="https://github.com/metatypedev/metatype/pull/620">#620</a>)
  - BREAKING: Store the typegraph on s3 (<a href="https://github.com/metatypedev/metatype/pull/620">#620</a>)
</summary>

Store the typegraph on s3 for multiple instance support mode.

#### Motivation and context

Reduce Redis data.

#### Migration notes

Environment variables:
- `REDIS_URL` has been removed
- For multiple instance support, the following variables are required:
`SYNC_REDIS_URL`, `SYNC_S3_HOST`, `SYNC_S3_REGION`, `SYNC_S3_BUCKET`,
`SYNC_S3_ACCESS_KEY`, `SYNC_S3_SECRET_KEY`; and the following variables
are optional: `SYNC_REDIS_PASSWORD`, `SYNC_S3_PATH_STYLE`. Otherwise,
none of them can be set.


### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>
<details open>
<summary>
Remove secret definitions through env vars (<a href="https://github.com/metatypedev/metatype/pull/666">#666</a>)
  - BREAKING: Remove secret definitions through env vars (<a href="https://github.com/metatypedev/metatype/pull/666">#666</a>)
</summary>

Remove the ability to define secrets  in the env vars of the typegate.

Secrets can now only be defined in the metatype config file and the
`--secret` CLI option.

#### Motivation and context

-
[MET-370](https://linear.app/metatypedev/issue/MET-370/easier-way-to-pass-secrets-in-metatypeyaml-config-file)
- Security
- Better DX

#### Migration notes

1. **Metatype config file**: On the node configuration, secrets are
defined at `secrets.<tg_name>.key`:

```yaml
# before
typegates:
  dev:
    env:
      TG_CONSOLE_POSTGRES_CONN: postgresql://postgres:password@localhost:5432/db?schema=console
      TG_CONSOLE_BASIC_ADMIN: password

#after
typegates:
  dev:
    secrets:
      console:
        POSTGRES_CONN: postgresql://postgres:password@localhost:5432/db?schema=console
        BASIC_ADMIN: password    
```

2. **Secret override option on meta/cli**

```sh
# before
meta deploy -f my-tg.py --secret TG_CONSOLE_POSTGRES_CONN=postgresql://postgres:password@localhost:5432/db?schema=console

# after
meta deploy -f my-tg.py --secret POSTGRES_CONN=postgresql://postgres:password@localhost:5432/db?schema=console
# or - with the typegraph name
meta deploy -f my-tg.py --secret console:POSTGRES_CONN=postgresql://postgres:password@localhost:5432/db?schema=console

```

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Add queryPrismaModel in the typegate runtime (<a href="https://github.com/metatypedev/metatype/pull/635">#635</a>)
</summary>

The `queryPrismaModel` function on the typegate typegraph queries rows
from a prisma model.

#### Motivation and context

Console.

#### Migration notes

_N/A_

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Upload artifacts to s3 (<a href="https://github.com/metatypedev/metatype/pull/638">#638</a>)
</summary>

Upload artifacts to S3 when sync-mode is enabled

#### Motivation and context

Sharing artifacts between replicas without including it in the typegraph
(and sync through redis)

#### Migration notes

No changes needed.

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Upload `PythonRuntime` artifacts and deps (<a href="https://github.com/metatypedev/metatype/pull/672">#672</a>)
</summary>

#### Motivation and context

Track artifact/module dependencis for `PythonRuntime`


#### Migration notes

`python.import(...)` and `python.import_(...)` accept an optional parameter `deps` that accepts list of dependencies for the python module.

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Upload `DenoRuntime` artifacts and deps (<a href="https://github.com/metatypedev/metatype/pull/674">#674</a>)
</summary>

- [x] Track deno runtime artifacts(also dependencies)
- [x] Upload artifacts during deploy to either local(single replica) or
shared(s3)
- [x] resolve artifacts(module and deps) upon typegate runtime.

#### Motivation and context

Persisting deno runtime artifacts to a local/shared storage.

#### Migration notes

`deno.import(...)` and `deno.import_(...)` accept an optional parameter
that accepts list of dependencies for the deno/ts module.

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Enable batch prisma queries in the typegate runtime (<a href="https://github.com/metatypedev/metatype/pull/682">#682</a>)
</summary>

Enable batch prisma queries (and transaction) in the typegate runtime

#### Motivation and context

Console

[MET-381](https://linear.app/metatypedev/issue/MET-381/console-collections)

#### Migration notes

<!-- Explain HOW users should update their code when required -->

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Artifact removal (<a href="https://github.com/metatypedev/metatype/pull/668">#668</a>)
</summary>

- Add GC: remove artifacts when unreferenced by any deployed typegraph
- Improve resource management: use `AsyncDisposable` and
`AsyncDisposableStack`
- Improve testability (for parallel testing): always read the tmpDir
config from the `Typegate` object

#### Motivation and context

[MET-433](https://linear.app/metatypedev/issue/MET-433/file-removal)

#### Migration notes

_N/A_

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
  - Enhanced search functionality with the addition of a new search bar.
  - Introduced new test configurations to improve script execution.
- Updated artifact storage documentation to clarify management
processes.
  - Added new extensions to support improved code commenting.

- **Bug Fixes**
- Removed outdated Deno import mapping settings to streamline
development environment setup.

- **Documentation**
- Expanded documentation on artifact tracking and management, including
reference counting and garbage collection mechanisms.

- **Refactor**
- Implemented interface changes in `QueryEngine` for better async
disposal management.
- Code restructuring in artifact management for enhanced performance and
maintainability.

- **Chores**
- Adjusted settings and configurations in the development environment to
align with current best practices.

- **Tests**
- Introduced new test cases for artifact upload and management
functionalities.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>


### Miscellaneous Tasks

<details >
<summary>
(release) Prepare 0.4.0 (<a href="https://github.com/metatypedev/metatype/pull/710">#710</a>)
</summary>

Bumps version to release 0.4.0.

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit


- **New Features**
- Updated the software across various components to version 0.4.0,
enhancing functionality and potentially introducing new features or
fixes.
- **Documentation**
- Updated version documentation in multiple configuration files to
reflect new version 0.4.0.
- **Bug Fixes**
- Adjusted version constants and dependencies to ensure compatibility
and stability with the new software version 0.4.0.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>
<details >
<summary>
(sdk,gate) Bump wasmtime to 20.0.0 and wit-bindgen to 0.24.0 (<a href="https://github.com/metatypedev/metatype/pull/695">#695</a>)
</summary>



</details>


### Refactor

<details >
<summary>
(gate) Wasi 0.2 pyrt (<a href="https://github.com/metatypedev/metatype/pull/687">#687</a>)
</summary>

- Rewrites the PythonRuntime host using a `componentize-py` based
component.
- Leaf through this
[memo](https://hackmd.io/@SC-qT-WXTROceKYdNA-Lpg/ryyAXiQlC/edit) for a
mental model.

</details>
<details >
<summary>
(libs/xtask,gate) Remove xtask/codegen (<a href="https://github.com/metatypedev/metatype/pull/700">#700</a>)
</summary>

Faster build time

#### Migration notes

Make sure to sync `typegate/src/types.ts` when an update is made on the
typegraph schema.

</details>
<details open>
<summary>
(sdk,gate) Improve temporal rt (<a href="https://github.com/metatypedev/metatype/pull/642">#642</a>)
  - BREAKING: improve temporal rt (<a href="https://github.com/metatypedev/metatype/pull/642">#642</a>)
</summary>

Improve the temporal runtime exposing more parameters and adding more
tests.

#### Motivation and context

MET-397. The old implementation was bug-ridden and did not expose
necessary params.

#### Migration notes

API changes to `TemporalRuntime` ctor, methods and generated
materializers.

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Pass test options in the first parameter (<a href="https://github.com/metatypedev/metatype/pull/667">#667</a>)
</summary>

Pass the test options in the first parameter along with the test
name/description.

#### Motivation and context

Avoid scrolling to the end of the test function to see/update the test
options.

#### Migration notes

_N/A_

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Testing

<details >
<summary>
Use local npm registry for tests (<a href="https://github.com/metatypedev/metatype/pull/646">#646</a>)
</summary>

Use verdaccio local npm registry for tests:
- The `@typegraph/sdk` package is published to the local npm registry,
and can now be consumed like any npm package from Nodejs or Deno.

#### Motivation and context

...

#### Migration notes

_N/A_

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


![tg-sdk-verdaccio](https://github.com/metatypedev/metatype/assets/43663718/d22d8d8b-175a-4858-9238-da0ab5ac79a2)

</details>


## [v0.3.6](https://github.com/metatypedev/metatype/releases/tag/v0.3.6) - 2024-03-14

### Bug Fixes

<details >
<summary>
Optimize typegraph size (<a href="https://github.com/metatypedev/metatype/pull/618">#618</a>)
</summary>

- Hash all type data to compare them on the conversion phase in
typegraph/core: remove duplicate types from type final typegraph
(duplicate: same value for all the fields except for the "random"
name/title).
- Skip unreferenced types in `.apply`

#### Motivation and context

Typegraph is too big sometimes.

#### Migration notes

<!-- Explain HOW users should update their code when required -->

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Miscellaneous Tasks

<details >
<summary>
Prepare release v0.3.6 (<a href="https://github.com/metatypedev/metatype/pull/626">#626</a>)
</summary>

Prepare release v0.3.6

#### Motivation and context

_N/A_

#### Migration notes

_N/A_

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>



