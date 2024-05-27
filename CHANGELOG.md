# Changelog

All notable changes to this project will be documented in this file.

## [unreleased]

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


### Features

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
(gate) `RandomRuntime` does not consider `enum`, `either`, `union` variants (<a href="https://github.com/metatypedev/metatype/pull/619">#619</a>)
</summary>

add either, enum, struct and union type support in Random Runtime. 

#### Motivation and context

generating random values for enums, either and union types was failing. 

#### Migration notes

_No Migrations Needed

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(python-wasi) Fix for vm not initialized after consecutive deploy (<a href="https://github.com/metatypedev/metatype/pull/617">#617</a>)
</summary>

Bug fix for typegate throwing `vm not initialized` after reload

#### Motivation and context

Bug fix

#### Migration notes

No Migrations Needed

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Apply from context (<a href="https://github.com/metatypedev/metatype/pull/616">#616</a>)
</summary>

Fix type validators for apply from context.

#### Motivation and context

Bug.

#### Migration notes

_N/A_

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
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


## [v0.3.5](https://github.com/metatypedev/metatype/releases/tag/v0.3.5) - 2024-03-05

### Bug Fixes

<details >
<summary>
(cli) Fix for `meta-cli deploy` exit with code `0` on failure (<a href="https://github.com/metatypedev/metatype/pull/600">#600</a>)
</summary>

fix the issue where `meta-cli deploy` command exits with code 0 on
failure.

#### Motivation and context

bug fix

#### Migration notes

No changes needed.

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(typegate,typegraph) Minor bugs (<a href="https://github.com/metatypedev/metatype/pull/596">#596</a>)
</summary>

Just a few very minor bugs I'd encountered this week. Tests pending.

#### Motivation and context

Bugs.

#### Migration notes

_No changes required_

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Show error message for unregistered type name (<a href="https://github.com/metatypedev/metatype/pull/594">#594</a>)
</summary>

Check and throw the error for the `expose` function when called from the
Python SDK.

#### Motivation and context

We got a finalization failure when there are some unregistered type
referenced with `g.ref`.

#### Migration notes

_No changes needed._

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Remove injections from prisma output types (<a href="https://github.com/metatypedev/metatype/pull/597">#597</a>)
</summary>

Remove injections from generated output types for prisma operations.

#### Motivation and context

Generated types fail validations (_injection not allowed in output
types_).

#### Migration notes

_No changes needed_.

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Esm customizer for typegate deno ext (<a href="https://github.com/metatypedev/metatype/pull/606">#606</a>)
</summary>

Enables v8 snapshots integration for `meta typegate` subcommand and the
standalone typegate. Also bumps deno to 1.41.0.

#### Motivation and context

</details>
<details >
<summary>
Re-enable macos-latest cli-compat test job (<a href="https://github.com/metatypedev/metatype/pull/608">#608</a>)
</summary>

Fixes and enables the broken job.

#### Motivation and context

Job was disabled earlier to mysterious breakages.

#### Migration notes

__No changes required__

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Features

<details >
<summary>
(deno/sdk) Native function embedding in typescript (<a href="https://github.com/metatypedev/metatype/pull/598">#598</a>)
</summary>

Add support for function or lambda definition typescript sdk for
`deno.func` similarly to how `python.from_def` in python sdk works.

#### Motivation and context

Providing a string is a bit impractical and counter-intuitive espcially
when the sdk language matches with runtime's language.

#### Migration notes

No changes needed.

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
(sdk) Testing framework integration 2 (<a href="https://github.com/metatypedev/metatype/pull/579">#579</a>)
</summary>

#### Motivation and context

Continuation of #566 , focused on prisma runtime.

#### Migration notes

N/A

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
(sdk) From_random injection (<a href="https://github.com/metatypedev/metatype/pull/593">#593</a>)
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
This change includes changes in StringFormats(added some string
formats), logic to provide random values for type nodes and tests to
validate the changes.
The changes are mostly in the typegraph sdk. 

#### Motivation and context

<!-- Explain WHY the was made or link an issue number -->
This feature enables the user to inject random values for a field(**Type
Node**) when defining a **Typegraph**.

#### Migration notes
_No changes needed_.

<!-- Explain HOW users should update their code when required -->

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Remove obsolete restrictions on prisma (<a href="https://github.com/metatypedev/metatype/pull/592">#592</a>)
</summary>

#### Motivation and context

Since v5, where on unique queries exposes all the fields, not just
unique fields.

</details>
<details >
<summary>
Parameter transformation (<a href="https://github.com/metatypedev/metatype/pull/587">#587</a>)
</summary>

Enable parameter transformation with the `.apply()` method.
It has more or less the same logic as `.reduce()` with the ability to
flatten the input type.


#### Motivation and context

This feature enables simpler APIs (input types) on top of runtimes
(e.g.: prisma).

#### Migration notes

_No changes needed_.

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details open>
<summary>
Nested context query (<a href="https://github.com/metatypedev/metatype/pull/595">#595</a>)
  - BREAKING: Nested context query (<a href="https://github.com/metatypedev/metatype/pull/595">#595</a>)
</summary>

- Revert context flattening
- Enable jsonpath-like key to access nested object fields or array items
on the context.

#### Migration notes

If you access the context directly in your application (through the
token), access to nested fields shall be updated.
E.g. the expression `context["profile.id"]` have to turned to
`context.profile.id`.

### Checklist

- [x] The change come with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Miscellaneous Tasks

<details >
<summary>
(release) Bump 0.3.5 (<a href="https://github.com/metatypedev/metatype/pull/613">#613</a>)
</summary>

Ready for release of v0.3.5

#### Motivation and context

Required by console.

#### Migration notes

_No changes required__.

### Checklist

- [ ] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Refactor

<details >
<summary>
(sdk) Move post-processing functions to the typegate (<a href="https://github.com/metatypedev/metatype/pull/586">#586</a>)
</summary>

#### Motivation and context

Depends on #579 
Compiled `wasm` bin  size is too large, goal is to reduce it to ~3MB.

#### Migration notes

N/A

### Checklist

- [x] The change come with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details open>
<summary>
Make fat `meta-cli` the default (<a href="https://github.com/metatypedev/metatype/pull/607">#607</a>)
  - BREAKING: make fat `meta-cli` the default (<a href="https://github.com/metatypedev/metatype/pull/607">#607</a>)
</summary>

Switch the default `meta-cli` release to the fat version (the one that
includes the `typegate` subcommand).

#### Motivation and context

</details>


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
