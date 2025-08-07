# Changelog

All notable changes to this project will be documented in this file.

## [v0.5.1-rc.6](https://github.com/metatypedev/metatype/releases/tag/v0.5.1-rc.6) - 2025-08-07

### Refactor

<details >
<summary>
Ordered recieve (<a href="https://github.com/metatypedev/metatype/pull/1041">#1041</a>)
</summary>



</details>


## [v0.5.1-rc.5](https://github.com/metatypedev/metatype/releases/tag/v0.5.1-rc.5) - 2025-07-18

### Bug Fixes

<details open>
<summary>
(gate) Auth refactor (<a href="https://github.com/metatypedev/metatype/pull/1028">#1028</a>)
  - BREAKING: auth refactor (<a href="https://github.com/metatypedev/metatype/pull/1028">#1028</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Solves
[MET-885](https://linear.app/metatypedev/issue/MET-885/auth-refactor).

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- OAuth2 authentication now supports multiple clients per provider with
explicit client ID and redirect URI configuration.
- Introduced a secure PKCE-based token flow requiring Redis for state
management, including new token exchange and refresh endpoints.
  - Added Redis configuration support for both sync and non-sync modes.

- **Improvements**
- Unified OAuth2 configuration across Python, TypeScript, and Rust SDKs
with a single structured interface replacing provider-specific methods.
- Enhanced validation and security for OAuth2 redirect URIs and client
identification.
  - Updated JWT token duration defaults and made them configurable.
  - Modularized Redis URL parsing and connection logic.

- **Bug Fixes**
- Improved error handling and validation in OAuth2 token and
authorization flows.

- **Documentation**
- Updated OAuth2 authentication docs to reflect the new PKCE token flow,
token refresh, and Redis requirements.
- Added Redis configuration and updated JWT duration defaults in
environment variable documentation.

- **Tests**
- Expanded authentication tests to cover PKCE, Redis state management,
token exchange, and refresh flows.

- **Chores**
  - Updated example projects to use the new OAuth2 configuration format.
  - Removed deprecated OAuth2 helper methods and related code.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
(sub) Recover from broken run + race conditions (<a href="https://github.com/metatypedev/metatype/pull/1033">#1033</a>)
</summary>

* Broken run
1. Detect already handled schedules but interrupted before closing then
close/skip them
2. Try to recover from schedule dups such as

```
 [Start Start ...] or
 [... Stop Stop] or
 [ .... Event X Event X ... ]
```

These dups can occur when we crash at a given timing and the underlying
event of the appointed schedule was not closed. The engine will happily
append onto the operation log, we throw by default but realistically we
can recover.
However 1. should make sure dups do not occur accross all nodes, this
should mitigate unknown unknowns (timestamp identifies schedules so it
should be safe).
WARN: Undesirable side effects cannot be ruled out if we crash before
saving the Saved results.

* Moved from setInterval to a custom blocking async interval
* Changed lease renew logic
#### Migration notes

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Summary by CodeRabbit

- **New Features**
- Added a Redis Commander service for easier Redis database management
via a web interface.
- Introduced lease heartbeat renewal to automatically manage lease
lifetimes.
- Added asynchronous interval control to ensure sequential execution of
recurring tasks.

- **Bug Fixes**
- Improved handling of duplicate operations and run state validation to
prevent data inconsistencies and duplicate scheduling.
  - Enhanced logic to prevent appending operations to stopped runs.
- Added run log integrity validation to detect corrupted or overlapping
run states.

- **Refactor**
- Replaced and reorganized utility functions for checking run status and
operation scheduling.
- Updated type definitions and imports for better code clarity and
maintainability.
- Improved logging, debugging, and tracing for better observability and
troubleshooting.
- Replaced standard intervals with controlled async intervals to avoid
concurrency issues.

- **Tests**
- Added assertions to verify lease expiration and run state consistency.

- **Style**
  - Reformatted import statements for consistency and readability.

- **Documentation**
- Added comments and documentation to clarify lease handling,
concurrency, and run integrity validation.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Prisma query batching (<a href="https://github.com/metatypedev/metatype/pull/1027">#1027</a>)
</summary>



</details>


### Features

<details >
<summary>
(gate) Idempotent request (<a href="https://github.com/metatypedev/metatype/pull/1031">#1031</a>)
</summary>

#### Migration notes

None

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Introduced idempotency support for GraphQL requests, enabling repeated
requests with the same idempotency key to return cached responses for up
to one day.
- Added a new GraphQL query `nextInt` that returns an incrementing
integer.
- Provided documentation explaining how to use the idempotency key
header to ensure safe request retries.

- **Chores**
- Removed an unused port and its metadata from internal configuration
files.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
(sub) Query workflow logs + timing bug fix when stressed (<a href="https://github.com/metatypedev/metatype/pull/1034">#1034</a>)
</summary>

* Make a separate entity for log events
* Query log by run
* Fix timing error when there are many workflows running at the same
time but too few workers
([MET-902](https://linear.app/metatypedev/issue/MET-902/append-stop-missed-in-rare-cases-even-when-workflow-is-terminated))

#### Migration notes

* `ctx.logger.*()` does not return Promise<void> anymore

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

* **New Features**
* Added structured logging support to workflows, enabling logs with
levels (Info, Warn, Error) to be recorded and queried for each workflow
run.
* Workflow run results now include detailed logs, accessible via GraphQL
queries.
* Introduced documentation on debugging workflows and accessing logs in
real time.
* Added a stress test script and a helper client for workflow run
management.

* **Bug Fixes**
* Improved deduplication of operations to prevent duplicate logs after
crashes or incomplete saves.

* **Improvements**
* Logging methods (`info`, `warn`, `error`) are now synchronous for
better usability.
* Enhanced error handling and validation in workflow runtime and agent
logic.
  * Lowered the minimum polling interval for workflow status checks.

* **Documentation**
* Expanded documentation with detailed guides and examples for workflow
logging and debugging.

* **Tests**
* Extended test coverage to verify workflow logs and blocking interval
behavior.
* Updated existing tests to reflect new synchronous logging and log
retrieval features.

* **Style**
* Various formatting and consistency improvements in code and type
declarations.

* **Chores**
* Updated dependencies and configuration for improved compatibility and
performance.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>
<details >
<summary>
(sub) Detect non deterministic run (<a href="https://github.com/metatypedev/metatype/pull/1037">#1037</a>)
</summary>



</details>


### Miscellaneous Tasks

<details >
<summary>
Update deno to v2.2.4 (<a href="https://github.com/metatypedev/metatype/pull/923">#923</a>)
</summary>



</details>
<details >
<summary>
Bump ghjk to 0.3.1-rc.2 (<a href="https://github.com/metatypedev/metatype/pull/1029">#1029</a>)
</summary>

= Updates ghjk to 0.3.1-rc.2

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

* **Chores**
* Upgraded the GHJK tool and related dependencies to version v0.3.1-rc.2
across workflows, Dockerfiles, and configuration files.
* Updated Python version to 3.9.23 and improved Docker build context
handling for Rust projects.
* Switched to using external GHJK packages for imports and streamlined
environment setup in CI workflows.
* Expanded and reorganized ignore and configuration files for better
build and linting control.
* Refreshed port references, versions, build dependencies, and profiles
in configuration files.
* Updated environment variables and deployment workflows for consistency
and reliability.
* Added new GHJK and Deno configuration files to support workspace and
import map management.

* **Refactor**
* Reformatted and improved code style across many files for consistency
and readability, including type declarations, method signatures,
imports, and code generation templates.
  * Updated export and import orders in various modules for clarity.
* Improved formatting in test cases and utility scripts for better
maintainability.
* Enhanced formatting and indentation in HTML, YAML, and CSS files for
readability.

* **Documentation**
* Updated contributing instructions to reflect new tool versions and
directory names.

* **Bug Fixes**
* Increased the timeout threshold for Python runtime tests to reduce
false negatives.
* Improved workflow reliability by sourcing environment activation
scripts and updating caching strategies.

* **New Features**
* Added new configuration files for GHJK and Deno environments to
support enhanced build and development workflows.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


## [v0.5.1-rc.4](https://github.com/metatypedev/metatype/releases/tag/v0.5.1-rc.4) - 2025-06-02

### Miscellaneous Tasks

<details >
<summary>
Bump to v0.5.1-rc.4 (<a href="https://github.com/metatypedev/metatype/pull/1023">#1023</a>)
</summary>

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **Chores**
- Updated project, dependency, and Docker image versions from 0.5.1-rc.3
to 0.5.1-rc.4 across multiple files and templates.

- **Tests**
- Disabled certain Python runtime performance tests by commenting them
out or marking them as ignored.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


### Refactor

<details >
<summary>
Relax prisma type safety to decrease type count (<a href="https://github.com/metatypedev/metatype/pull/1019">#1019</a>)
</summary>

- Improves the type count of the prisma type generators by relaxing type
safety. Namely:
- Create/update types have all related types as optional even when
required
- Where filters will always have all the relationships present even when
netsted in another where type

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Added an optional selection flag property to multiple TypeScript
selection types, enabling enhanced selection capabilities in generated
client code.

- **Bug Fixes**
- Updated version checks in initialization routines to expect version
"0.5.1-rc.3".

- **Refactor**
- Simplified and streamlined type generation logic by disabling
selective relationship and model skipping in generated types.
- Reorganized and clarified struct and type alias declarations for
improved code structure and maintainability.
- Adjusted internal variant ordering for RPC calls to improve internal
consistency.

- **Tests**
- Updated test output to provide more concise and relevant debugging
information.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


## [v0.5.1-rc.3](https://github.com/metatypedev/metatype/releases/tag/v0.5.1-rc.3) - 2025-05-13

### Bug Fixes

<details >
<summary>
(gate) Update graphql playground deps (<a href="https://github.com/metatypedev/metatype/pull/1012">#1012</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Fixes broken graphQL playground by updating the react version and
pinning graphiql.

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Upgraded the GraphiQL playground to use the latest React and GraphiQL
versions for improved performance and compatibility.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
(perf) Improve the performance of the typegraph expansion (<a href="https://github.com/metatypedev/metatype/pull/1008">#1008</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

The previous single-pass recursive algorithm for the typegraph expansion
was buggy and had terrible performance.
This PR attempts to simplify the expansion, making it easier to debug
and have better performance. For more details, see the doc comments at
the crate root (`src/typegraph/graph/src/lib.rs`).

Other changes:
- Change the github runners:
  - Downgrade to Ubuntu 22.04
  - Use the native Github runners for ARM

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

_N/A_

---

- [x] The change comes with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] ~End-user documentation is updated to reflect the change~


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- The tree view web tool now displays a dynamic footer status bar
showing loading state and type count, and supports union/either node
types in typegraph visualization. The default tree depth can be set via
a URL parameter.

- **Bug Fixes**
- Corrected naming and ordering of selection types and partial types in
generated Rust, TypeScript, and Python client code for composite and
cyclic structures.
  - Fixed a job naming typo in the test workflow.

- **Refactor**
- Major internal overhaul of typegraph conversion logic, simplifying and
restructuring the process for converting, linking, and registering
types.
- Streamlined and clarified logic for rendering TypeScript FDK templates
and type registries.
- Improved visibility and access to generated TypeScript client manifest
types.

- **Chores**
- Updated GitHub Actions workflows to use explicit Ubuntu 22.04 runners
for consistency.
- Increased verbosity of the meta-cli serialize command for tree view
tooling.
  - Updated dependencies in configuration files.

- **Documentation**
- Added comprehensive module-level documentation for the typegraph
expansion process.

- **Tests**
- Added and reorganized migration test files and improved structure of
test-generated client code for clarity and accuracy.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Hostcall token issue (<a href="https://github.com/metatypedev/metatype/pull/1010">#1010</a>)
</summary>



</details>
<details >
<summary>
Metagen select in client_ts (<a href="https://github.com/metatypedev/metatype/pull/1011">#1011</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Fix selection for optional types in metagen

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Added support for alias selections in the selection system, improving
handling of optional and list types.

- **Style**
- Enhanced debug output for various type structures, including list,
object property, optional, and union types, to display more concise and
informative information during debugging.

- **Chores**
- Updated dependencies to enable additional features for improved
debugging support.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Substantial filter missing type (<a href="https://github.com/metatypedev/metatype/pull/1014">#1014</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Add missing type from
[MET-870](https://linear.app/metatypedev/issue/MET-870/subs-filter-by-run-id).

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Added support for "run_id" as a special property in filtering options.
- Enhanced filtering to include conditions on the "run_id" field in
workflow searches.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Substantial filter missing type (<a href="https://github.com/metatypedev/metatype/pull/1014">#1014</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Add missing type from
[MET-870](https://linear.app/metatypedev/issue/MET-870/subs-filter-by-run-id).

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Added support for "run_id" as a special property in filtering options.
- Enhanced filtering to include conditions on the "run_id" field in
workflow searches.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Fix injection filter in object properties (<a href="https://github.com/metatypedev/metatype/pull/1013">#1013</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Only filter out leaf nodes of the injection tree.
- Type the selection and output type for nested functions (part of
[MET-862](https://linear.app/metatypedev/issue/MET-862/nested-functions-have-wrong-return-types)).
- Support conservative expansion; needed for FDK handlers that take the
original type.
- Improve logging:
- Disable tracing instrumentations unless the `tracing-instrument`
feature is enabled (CLI). This will make the output more readable by
default.
- Enable logging on crates other than `meta` (CLI): `typegraph`,
`tg_schema`, `metagen`.

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

_N/A_

---

- [ ] The change comes with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Added advanced typegraph expansion capabilities with configurable
duplication and naming engines.
  - Introduced support for disconnected types in typegraphs.
- Added optional tracing instrumentation in the CLI, enabled via a
feature flag.

- **Improvements**
- Enhanced manifest rendering for TypeScript, Python, and Rust clients
with better type caching and logging.
- Improved policy handling and expansion logic for richer typegraph
processing.
- Updated synchronization primitives for lazy initialization, improving
thread safety.

- **Bug Fixes**
- Prevented potential runtime errors in filter utilities by adding null
checks.

- **Refactor**
- Major internal restructuring of typegraph expansion, duplication, and
naming systems for extensibility and maintainability.
  - Simplified and unified module imports and type definitions.

- **Chores**
- Updated tests and fixtures to align with new typegraph schema handling
and expansion logic.
- Added a new optional CLI feature for conditional tracing
instrumentation.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


### Features

<details >
<summary>
(kv) Push, pop (<a href="https://github.com/metatypedev/metatype/pull/1006">#1006</a>)
</summary>

Simple push/pop

#### Migration notes

None

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Summary by CodeRabbit

- **New Features**
- Added push and pop operations to the key-value runtime, enabling list
manipulation on both ends for Redis-backed stores.
- **Tests**
- Introduced new tests covering push and pop operations to ensure
correct behavior and data integrity.
- **Documentation**
- Updated KvRuntime documentation to include the new list push and pop
operations.
- **Chores**
- Updated pre-commit configuration for improved accuracy and formatting.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


### Miscellaneous Tasks

<details >
<summary>
Bump to v0.5.1-rc.3 (<a href="https://github.com/metatypedev/metatype/pull/1015">#1015</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Bump to v0.5.1-rc.3

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **Chores**
- Updated version numbers across multiple packages and configuration
files from 0.5.1-rc.2 to 0.5.1-rc.3.
- Updated Docker Compose service images and SDK/runtime dependencies to
use the new version.
- Refreshed version constants and metadata to reflect the latest release
candidate.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


## [v0.5.1-rc.2](https://github.com/metatypedev/metatype/releases/tag/v0.5.1-rc.2) - 2025-04-18

### Bug Fixes

<details >
<summary>
(sdk) Node SDK cross-platform compatibility (<a href="https://github.com/metatypedev/metatype/pull/1000">#1000</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Closes
[MET-876](https://linear.app/metatypedev/issue/MET-876/nodejs-file-descriptor-api-not-working-on-macos).

<!-- 2. Explain WHY the change cannot be made simpler -->

- FFI had to be used to make file descriptors blocking on unix systems
because they are asynchrnous by default, meaning a file descriptor read
immediately fails when there's no data instead of waiting. Deno
abstracts this in its implementation but we have to handle edge cases by
ourselves with NodeJS.
- Fixes CI issues by upgrading ghjk to v0.2.2.

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **Bug Fixes**
- Improved compatibility for reading standard input on macOS and Linux
systems, ensuring smoother and more reliable input handling.
- **Chores**
- Updated the version of the development environment tool used across
workflows, documentation, and build configurations to v0.2.2.
- **Documentation**
- Updated a Python code generation example in the documentation for
clearer reference.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Type dedup and substantial filters (<a href="https://github.com/metatypedev/metatype/pull/994">#994</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Fixes type dedup when using list and optional
- Add `run_id` filter for substantial
([MET-870](https://linear.app/metatypedev/issue/MET-870/subs-filter-by-run-id))

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Introduced two public endpoints for retrieving structured data as
lists and optional objects.
  - Expanded filtering capabilities to support an additional identifier.

- **Improvements**
- Enhanced asynchronous processing to ensure operations complete
reliably.
  - Streamlined messaging and error feedback for greater clarity.
  - Optimized naming consistency across system components.
- Enhanced functionality of the `SpecialTerms` type for better
expression evaluation.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


### Features

<details >
<summary>
Expanded typegraph (<a href="https://github.com/metatypedev/metatype/pull/978">#978</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- [x] Add a crate for an expanded version of the typegraph where hoisted
parameters are expanded
- [x] Use the expanded typegraph in metagen
  - [x] fdk_rs
  - [x] client_rs
  - [x] fdk_ts
  - [x] client_ts
  - [x] fdk_py
  - [x] client_py
  - [x] fdk_substantial
- [x] Support for injection in metagen: hide injected types in input
types

<!-- 2. Explain WHY the change cannot be made simpler -->

The expanded typegraph duplicates the type for different injection data.
All numeric references for types, runtimes, materializers and policies
are inlined, removing the need to always have a reference to the
typegraph object itself.

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **Chores**
- Updated dependency and workspace configurations to incorporate a new
module for improved version management.
- **New Features**
- Introduced enhanced client generation across Python, Rust, and
TypeScript with new manifest systems to better support GraphQL
integration.
- Added new methods for managing injection nodes and their associated
data, enhancing dependency injection capabilities.
- **Refactor**
- Overhauled the type schema and metadata management systems for
improved clarity, performance, and memory safety.
- Refined error handling to provide clearer diagnostics during
multi-threaded operations.
- Restructured node metadata definitions and argument types for improved
clarity and consistency.

These improvements streamline our code generation pipeline for a more
robust and maintainable experience.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


### Miscellaneous Tasks

<details >
<summary>
Bump to v0.5.1-rc.2 (<a href="https://github.com/metatypedev/metatype/pull/1001">#1001</a>)
</summary>

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Added a new Deno configuration for module import mappings and
dependency locking.

- **Bug Fixes**
- Improved content-type validation in GraphQL response handling for
Python tests.

- **Refactor**
- Standardized type naming conventions and method names in test code and
Rust modules.
  - Updated enum variant order for improved code consistency.

- **Chores**
- Updated all version references from 0.5.1-rc.1 to 0.5.1-rc.2 across
packages, Docker images, and dependencies.
  - Removed obsolete SQL migration and lock files.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


## [v0.5.1-rc.1](https://github.com/metatypedev/metatype/releases/tag/v0.5.1-rc.1) - 2025-03-20

### Bug Fixes

<details >
<summary>
(gate) Skip unnecessary secret decryption step on `SYNC_FORCE_REMOVE` (<a href="https://github.com/metatypedev/metatype/pull/976">#976</a>)
</summary>

#### Migration notes

None

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Introduced a secure, improved mechanism for downloading type graph
data, enhancing the retrieval process and ensuring sensitive data is
handled safely.
  
- **Refactor**
- Updated processes to consistently leverage the new download approach,
streamlining functionality and reinforcing robust error handling.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
(gate) Struct typecheck codegen (<a href="https://github.com/metatypedev/metatype/pull/983">#983</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Fixup for https://github.com/metatypedev/metatype/pull/980

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Enhanced object validation now accepts additional properties when
allowed, offering more flexible data processing.
- Introduced a new REST endpoint that returns structured, stringified
data based on provided input.

- **Tests**
- Added a test case to verify the functionality of the new REST endpoint
and ensure robust input validation.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
(metagen) Do not skip empty struct input (<a href="https://github.com/metatypedev/metatype/pull/989">#989</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Make sure to include empty struct input in manifest
- Update json schema
- Bump version to v0.5.1-rc.1

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **Chores**
- Updated versions across packages, dependencies, container images, and
configurations to v0.5.1-rc.1 for enhanced consistency.
- **New Features**
- Introduced a new configuration option allowing users to exclude client
code generation.
- Added new type definitions in sample integrations to improve
type-safety.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
(test) Add lockfile for metagen test (<a href="https://github.com/metatypedev/metatype/pull/981">#981</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Fixes the build issue by adding a lockfile.

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(typegraph) Implement `additional_props` (<a href="https://github.com/metatypedev/metatype/pull/980">#980</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Closes
[MET-843](https://linear.app/metatypedev/issue/MET-843/addiditioonalprops-in-struct-options-doesnt-work).

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Introduced a configurable flag in object definitions that controls
whether extra, unspecified properties are allowed. This enhances schema
validation and data conversion by permitting flexible input when
enabled.
- Updated validation logic to conditionally bypass errors for additional
properties when permitted.

- **Tests**
- Added new test cases and a helper function to verify input
stringification and validation for both simple and nested structures.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Bad typenames and internal policy (<a href="https://github.com/metatypedev/metatype/pull/979">#979</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Fix bad duplicated typenames for duplicate materializers and
predefined internal policy function.

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Summary by CodeRabbit

- **New Features**
- Enhanced access control with stricter authorization checks and refined
data exposure across different contexts.
- Introduced new type aliases for improved clarity in method return
types.
	- Added a new internal policy for access control.
- **Refactor**
- Streamlined naming for inputs and outputs to ensure consistent
labeling.
	- Adjusted evaluation logic to provide clearer security outcomes.
- **Tests**
- Expanded automated test scenarios to verify deduplication and
authorization behavior.
	- Added new test cases to validate internal policy access control.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


### Features

<details open>
<summary>
(gate) Policies should affect visibility on introspection (<a href="https://github.com/metatypedev/metatype/pull/963">#963</a>)
  - BREAKING: policies should affect visibility on introspection (<a href="https://github.com/metatypedev/metatype/pull/963">#963</a>)
</summary>

This ended up becoming  a full rewrite of the introspection logic.
For context, the old implementation generated types dynamically but also
did a few parts statically (the __schema.types list). This worked as
long as we assume all object types fields are not context dependent.
Which resulted in a few bugs on injected fields.

In this new implementation, we "define" a type as required (it is added
into the __schema.types list), still recursively but this allows
emitting types with adhoc suffixes in demand depending on the policies
or injections. Then when the type is refered we simply give a reference
to it.

#### Migration notes

* There can be multiple empty object scalars (vs only one previously)
* Fields can be missing if not authorized
* Type names depends on its shape (e.g.Foo missing a field would have
different name than Foo with all its field), this extends to unions
(depends on the variant names with each following the same naming rule)


- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Summary by CodeRabbit

- **New Features**
- Enhanced GraphQL introspection now offers a more comprehensive and
consistent schema view with refined field visibility controls.
- New introspection queries and fragments improve the introspection
capabilities of the GraphQL API.
- Introduced new functions for managing type visibility and policies
within the type graph context.
- Added new test functions to validate introspection queries and their
structures.

- **Refactor**
- Improved runtime initialization and error handling lead to a smoother
query engine performance and more robust schema generation.
- Code structure has been enhanced for better organization and clarity,
particularly in type visibility management.
- Modifications to authorization checks and policy evaluations enhance
granularity and processing efficiency.

- **Tests**
- Expanded test coverage validates the new introspection enhancements
and policy enforcement, ensuring reliable operation.
- New tests focus on visibility checks and policy rule logic during
introspection on complex and simple type graphs.
- Added tests for introspection functionalities and visibility policies
in various scenarios, ensuring comprehensive validation.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details open>
<summary>
(metagen) Hostcall transport (<a href="https://github.com/metatypedev/metatype/pull/982">#982</a>)
  - BREAKING: hostcall transport (<a href="https://github.com/metatypedev/metatype/pull/982">#982</a>)
</summary>

- [x] update docs
- [x] HostcallTransport for fdk_rs/fdk_ts/fdk_py
- [x] Reimpml fdk_py
- [x] MET-815 `QueryGraph` method clash

#### Migration notes

- `fdk_rs`: transport construction is no longer a method on `QueryGraph`
but a set of functions in th `transports` module.
- `fdk_ts`: transport construction is no longer a method on `QueryGraph`
but instead a static method on `Transports` class.
- `fdk_py` now generates all code into `fdk.py`
  - Decorators now use the `handler_{fn_name}` pattern
  - Decorators now expect a second `Ctx` object.
- `Ctx.gql` method now takes `typing.Mapping` instead of raw JSON `str`
- Transport construction is no longer a method on `QueryGraph` but
instead a static method on `Transports` class.

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Summary by CodeRabbit

- **New Features**
- Introduced enhanced GraphQL client transports that support
asynchronous host calls and refined query handling, enabling more robust
queries, mutations, and file upload operations.
- Added new `HostcallPump` class for managing host calls and responses,
improving the handling of asynchronous operations.
- Expanded functionality for handling selections and query construction,
including new types and methods in the `QueryGraph` class.
- Updated `Cargo.toml` configurations to include workspace features for
`metagen-client`, allowing for specific feature activation.
- Adjusted the `typegraphUrl` format in the `hostcallCtx` for improved
communication protocols.

- **Refactors & Chores**
- Streamlined internal architecture by consolidating transport logic and
improving type mapping and dependency management across modules.
- Removed legacy code and enhanced error handling and logging for
increased stability.
- Adjusted paths and target architecture in build scripts for
consistency with updated directory structures.

- **Tests & Documentation**
- Expanded and reorganized test suites to verify the new client and
query graph functionality, with updated configuration options detailed
in the documentation.
- Enhanced test cases for better coverage of new features and
functionalities, including proxy primitives and selection handling.
- Updated test configurations to reflect new dependencies and structural
changes in the codebase.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
(sdk) Reusable import module (<a href="https://github.com/metatypedev/metatype/pull/970">#970</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Closes
[MET-819](https://linear.app/metatypedev/issue/MET-819/automated-typegraph-artifact-deps).

</details>
<details open>
<summary>
JSON RPC based typegraph (<a href="https://github.com/metatypedev/metatype/pull/877">#877</a>)
  - BREAKING: JSON RPC based typegraph (<a href="https://github.com/metatypedev/metatype/pull/877">#877</a>)
</summary>

#### Tasks

Replace WASM in typegraph with a client/server architecture using JSON
RPC through stdin/stdout.

- [x] Remove wit from `typgraph-core`
- [x] Codegen system for the SDK types
- [x] Rewrite the client SDKs
- [x] Write the JSON RPC server in the CLI
- [x] Update the build infrastructure
- [x] Fix broken tests

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

...

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>


### Refactor

<details >
<summary>
Break up the common crate into smaller ones (<a href="https://github.com/metatypedev/metatype/pull/977">#977</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Break up the common crate into a few smaller crates:
  - typegraph/schema
  - utils/grpc
  - utils/archive
  - typegate_api

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Exposed an updated public API with dedicated interfaces for
authentication and node management.

- **Refactor**
- Streamlined dependency and workspace organization by replacing legacy
naming with clearer, modern module references.

- **Chores**
- Updated package configurations to improve maintainability and set the
stage for future enhancements.

These changes maintain all existing functionality while providing a more
cohesive architecture and clearer public interfaces for end-user
interactions.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


## [v0.5.1-rc.0](https://github.com/metatypedev/metatype/releases/tag/v0.5.1-rc.0) - 2025-02-05

### Bug Fixes

<details >
<summary>
(cli) Avoid expected error backtrace (<a href="https://github.com/metatypedev/metatype/pull/960">#960</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Closes
[MET-801](https://linear.app/metatypedev/issue/MET-801/avoid-backtraces-on-expected-errors).

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **Chores**
- Updated error reporting configuration to reduce verbosity during panic
events.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Secret leak when recovering (<a href="https://github.com/metatypedev/metatype/pull/965">#965</a>)
</summary>

#### Migration notes

None

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

## Release Notes

- **New Features**
- Added a deep cloning utility function to prevent unintended data
mutations
- Introduced a new workflow management capability with a `sayHello`
function
  - Enhanced replay request filtering in agent runtime

- **Improvements**
  - Refined runtime configuration handling
  - Improved code modularity and error handling in agent runtime

- **Testing**
  - Updated sync test configuration with new Redis backend
  - Added new workflow test script

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>
<details >
<summary>
Support union type for object node in apply tree (<a href="https://github.com/metatypedev/metatype/pull/969">#969</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Solve
[MET-790](https://linear.app/metatypedev/issue/MET-790/failing-to-generate-composite-prisma-condition-types)
  - Support union type or object node in apply tree 

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
  - Enhanced type handling for optional and union types
  - Added support for complex GraphQL query retrieval
- Introduced new method for filtering user records with advanced
conditions

- **Tests**
  - Added test case for complex object retrieval
  - Expanded test coverage for union type processing

- **Improvements**
  - Refined error reporting for type resolution
  - Improved handling of optional and union type definitions

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details open>
<summary>
Metagen papercuts (<a href="https://github.com/metatypedev/metatype/pull/950">#950</a>)
  - BREAKING: metagen papercuts (<a href="https://github.com/metatypedev/metatype/pull/950">#950</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

Solves
[MET-761](https://linear.app/metatypedev/issue/MET-761/metagen-papercuts):
- Make generator naming consistent with the client_xx and fdk_xx format.
Prefer shortened names of languages like the extension name of source
files.
- Reuse a typegraph serialization across multiple generation runs in a
single cli invocation. It currently re-serializes a typegraph if it's
referenced twice.
- Explicit return types on QueryGraph methods for Typescript
- Support for non-record queries for Gql transport. Currently, one's
forced to name the query/mutation section which gets reflected in the
response name

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

Based on the comprehensive summary, here are the high-level release
notes:

- **Generator Naming**
  - Simplified generator names across the project
  - Updated from `fdk_typescript` → `fdk_ts`
  - Updated from `fdk_python` → `fdk_py`
  - Updated from `fdk_rust` → `fdk_rs`

- **Type Management**
- Transitioned from `Box<Typegraph>` to `Arc<Typegraph>` for improved
memory management
  - Enhanced type flexibility in query and mutation methods
  - Added support for single and multiple node operations

- **New Features**
- Added identity and identity update functions across TypeScript,
Python, and Rust clients
  - Improved caching mechanisms for typegraphs
  - Enhanced GraphQL transport layer with more flexible input handling

- **Documentation**
- Updated configuration examples and references to reflect new generator
names
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Use GraphQL-compliant response payload on error (<a href="https://github.com/metatypedev/metatype/pull/972">#972</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Use GraphQL-compliant response payload on error on all GraphQL
endpoints

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **Refactor**
- Consolidated JSON response formatting for both success and error
cases.
- Streamlined the handling of response structures across multiple
service endpoints.
- Improved consistency and reliability of data returned to clients,
ensuring structured JSON output for all interactions.
- Enhanced error handling to provide structured JSON responses across
various services.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Better error message for missing artifacts (<a href="https://github.com/metatypedev/metatype/pull/973">#973</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Solve
[MET-821](https://linear.app/metatypedev/issue/MET-821/bad-error-message-on-missing-deno-rt-deps)
  - Better error message for missing artifacts
  - Shared logic for artifact registration on postprocess

<!-- 2. Explain WHY the change cannot be made simpler -->

-

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Consolidated the artifact registration process to support bulk
handling of primary and dependency artifacts.

- **Refactor**
- Streamlined registration workflows across multiple runtime
integrations, enhancing efficiency and clarity.

- **Tests**
- Added comprehensive tests to ensure robust error reporting when
dependencies are missing.
- Introduced a new test case to validate behavior for non-existent
engine scripts.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


### Documentation

<details >
<summary>
(sub) Polish  substantial docs (<a href="https://github.com/metatypedev/metatype/pull/967">#967</a>)
</summary>

#### Migration notes

None

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **Documentation**
  - Enhanced documentation for Substantial runtime.
  - Added new section on Backend operations.
  - Renamed existing Backend section to "Persistence and Lifecycle."
- Introduced new subsections on workflow management concepts including
Context, Interrupts, Save, Send/Receive, and Ensure.
- Added a new section on Advanced Filters with examples for Python and
TypeScript.
  - Corrected typographical errors for improved clarity.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>


### Features

<details >
<summary>
(cli) Add port option on list subcommand (<a href="https://github.com/metatypedev/metatype/pull/968">#968</a>)
</summary>

remove default port and allow user specify the port directly from the
cli

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

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
	- Added optional port configuration for CLI command
	- Improved port specification flexibility for network operations

- **Bug Fixes**
	- Enhanced error handling for network requests
	- Removed hardcoded port value in favor of dynamic configuration

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Worker pooling (<a href="https://github.com/metatypedev/metatype/pull/962">#962</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Solve
[MET-806](https://linear.app/metatypedev/issue/MET-806/worker-pooling)

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **Bug Fixes**
	- Corrected a typographical error in a log message.
	- Enhanced error handling and reporting in various runtime components.

- **Refactor**
	- Improved worker management lifecycle methods.
	- Updated task delegation and worker allocation strategies.
	- Refined interrupt and workflow completion handling.
	- Enhanced configuration schema for worker settings.

- **New Features**
	- Introduced a more robust wait queue mechanism with timeout support.
	- Enhanced type safety for interrupt handling.
- Added new environment variables for managing Deno and substantial
worker settings.

- **Tests**
	- Added a comprehensive test suite for wait queue implementation.
- Updated test configuration to ignore tests for the latest release
version.
	- Enhanced validation logic for version handling.

- **Chores**
- Updated versioning across multiple configuration files and
dependencies to reflect the transition to a release candidate version.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Wasm worker manager (<a href="https://github.com/metatypedev/metatype/pull/966">#966</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Closes
[MET-805](https://linear.app/metatypedev/issue/MET-805/worker-manager-implementation-for-wasm-runtime-and-python).

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Release Notes

- **New Features**
  - Added WebAssembly (WASM) worker management capabilities.
  - Introduced new type definitions for WASM runtime interactions.
  - Enhanced worker pool and worker manager functionality.
- Introduced a new `WasmWorker` class for managing WebAssembly workers.

- **Configuration Changes**
- Updated global configuration to include WASM worker-related settings.
- Replaced `substantial_worker_wait_timeout_ms` with more granular
worker configuration options.
- Added new environment variables for WASM worker management:
`MIN_WASM_WORKERS` and `MAX_WASM_WORKERS`.

- **Runtime Improvements**
  - Refactored runtime initialization processes.
  - Improved worker lifecycle management.
- Enhanced error handling and logging for various runtime environments.
  - Removed explicit `destroy` operations in some runtime components.

- **Dependency Updates**
  - Updated Metatype version to `0.5.1-rc.0`.

- **Performance Optimizations**
  - Added pre-warming steps in performance tests.
  - Streamlined worker initialization and management.

- **Code Quality**
  - Improved code formatting and readability.
  - Simplified runtime and worker management interfaces.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>


## [v0.5.0](https://github.com/metatypedev/metatype/releases/tag/v0.5.0) - 2025-01-16

### Bug Fixes

<details >
<summary>
(gate,sdk) Fail fast on bad credentials before artifact upload (<a href="https://github.com/metatypedev/metatype/pull/961">#961</a>)
</summary>

Solves
[MET-793](https://linear.app/metatypedev/issue/MET-793/artifact-upload-allowed-with-wrong-credentials)

#### Migration notes

None

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

## Release Notes

- **New Features**
- Added a ping functionality to verify typegate connectivity and
credentials
- Introduced a new server health check mechanism across multiple
language implementations

- **Improvements**
  - Simplified error handling in deployment and query-related functions
  - Enhanced pre-deployment validation process

- **Testing**
  - Added test coverage for credential validation during deployment
  - Implemented new test scenarios for typegate connectivity checks

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
`selectAll` infinite recursion (<a href="https://github.com/metatypedev/metatype/pull/948">#948</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Closes
[MET-786](https://linear.app/metatypedev/issue/MET-786/typescript-client-selectall-infinite-recursion).

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Added nested composite structure support across multiple client
implementations
	- Enhanced selection handling for composite queries
	- Expanded type definitions for more complex data representations

- **Bug Fixes**
	- Improved selection processing logic in client implementations
	- Updated version compatibility for SDK imports

- **Chores**
	- Updated package dependencies to newer SDK versions
	- Reformatted and improved code readability across multiple files

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Patch proto to latest + update script (<a href="https://github.com/metatypedev/metatype/pull/953">#953</a>)
</summary>

Update protobuf-codegen and protobuff to latest (3.7.1)

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

## Release Notes

- **Dependency Updates**
  - Updated `protobuf` library from version 3.5.1 to 3.7.1
  - Updated `protobuf-codegen` crate to version 3.7.1

- **Build Configuration**
- Modified protobuf compiler output option from `--rust_out` to
`--rs_out`
  - Simplified protobuf code generation command

- **Compatibility**
  - Ensured compatibility with latest protobuf runtime version

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Bad name on shared types (<a href="https://github.com/metatypedev/metatype/pull/955">#955</a>)
</summary>

Since types can be shared, prefixing the name with the first
function/path encountered would be confusing for the other types that
also refers to it.

This patch disables prefixing for types with more than one referrer.

#### Migration notes

None

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

Based on the comprehensive summary of changes across multiple files,
here are the updated release notes:

- **Type System Refinement**
	- Standardized type naming conventions across multiple languages.
	- Replaced specific type aliases with more generic scalar types.
	- Updated function signatures to use simplified type definitions.

- **Version Updates**
	- Incremented metatype version from "0.5.0-rc.8" to "0.5.0-rc.9".

- **Upload Functionality**
- Modified file upload method return types to return boolean instead of
complex output.
	- Updated argument types for upload-related functions.

- **Performance and Naming Improvements**
	- Enhanced reference counting for type naming processor.
	- Refined type generation logic with more consistent naming strategies.

These changes primarily focus on improving type system consistency and
simplifying type definitions across different runtime environments.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Where type issues (<a href="https://github.com/metatypedev/metatype/pull/958">#958</a>)
</summary>

- Fixes issues with type counts.

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
  - Enhanced duplicate detection mechanism for type graphs.
  - Improved type identification and relationship tracking.
- Added new root functions for dynamic entity management in type
duplication.

- **Refactor**
  - Updated model identifier handling in type generation.
- Modified key management for skip models from type-based to
string-based keys.
- Transitioned from static to dynamic entity definitions for
scalability.

- **Bug Fixes**
  - Streamlined type duplicate detection logic.
  - Improved error handling for unsupported type scenarios.
- Adjusted assertions for serialization size and type count limits in
tests.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


### Features

<details >
<summary>
Python code validation (<a href="https://github.com/metatypedev/metatype/pull/939">#939</a>)
</summary>

Add python code validation on deploy

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Add json schema (<a href="https://github.com/metatypedev/metatype/pull/952">#952</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Add a self-hosted json schema that will be referenced to
[schemastore](https://www.schemastore.org/json/), part of
[MET-798](https://linear.app/metatypedev/issue/MET-798/metatype-schema-for-ide-support).

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Added comprehensive configuration schema validation for Metatype
system configuration files.
- Implemented JSON schema testing to ensure configuration integrity
across multiple YAML files.

- **Tests**
- Introduced new test suite for validating configuration schema using
Ajv JSON schema validator.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Unify worker manager (<a href="https://github.com/metatypedev/metatype/pull/954">#954</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Solves
[MET-667](https://linear.app/metatypedev/issue/MET-667/gate-unify-the-worker-manager-between-workflows-and-runtime)
  - [x] `BaseWorkerManager`
  - [x] Use in Deno runtime
  - [ ] ~Use in Python runtime~ _(followup PR)_
  - [ ] ~Use in Rust runtime~ _(followup PR)_
  - [ ] ~Worker pooling~ _(followup PR)_

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Summary by CodeRabbit

Based on the comprehensive summary, here are the updated release notes:

- **New Features**
- Enhanced worker management system with improved task tracking and
execution.
- Introduced new `WorkerManager` for more robust Deno runtime
operations.
  - Added support for inline artifact generation and management.
- New asynchronous method `getInlineArtifact` in the `ArtifactStore`
class.

- **Improvements**
- Streamlined messaging and event handling across different runtime
components.
  - Improved error reporting and task lifecycle management.
  - Refined type definitions for better type safety.

- **Breaking Changes**
  - Removed `DenoMessenger` and `LazyAsyncMessenger` classes.
  - Restructured workflow event and message handling.
  - Updated task ID generation mechanism.

- **Performance**
  - Optimized worker initialization and task execution.
  - Introduced more efficient task tracking and resource management.

- **Bug Fixes**
  - Improved error handling in worker and runtime environments.
  - Enhanced message communication between workers and main thread.
  - Removed outdated test cases to focus on relevant functionality.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Force cleanup at boot with `SYNC_FORCE_REMOVE=true` (<a href="https://github.com/metatypedev/metatype/pull/956">#956</a>)
</summary>

#### Migration notes

None

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Added optional `SYNC_FORCE_REMOVE` configuration variable for typegate
synchronization.
	- Introduced ability to forcefully remove cached typegraphs at boot.
- Added a new method to retrieve all history entries from the Redis
replicated map.
- Introduced a new function to return a greeting based on a provided
name.
- Added a synchronization feature test suite for validating cleanup
logic.

- **Documentation**
- Updated documentation to reflect new synchronization configuration
option.

- **Improvements**
- Enhanced the `Typegate` class with a method to facilitate bulk removal
of typegraphs during initialization.
- Made the `replicatedMap` parameter publicly accessible in the
`ReplicatedRegister` class constructor.
- Updated configuration retrieval to include the new `forceRemove`
property.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>
<details >
<summary>
Upgrade script from 0.4.10 to 0.5.0 (<a href="https://github.com/metatypedev/metatype/pull/941">#941</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- [x] Solve
[MET-774](https://linear.app/metatypedev/issue/MET-774/add-migration-scripts-and-re-enable-published-test)

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Release Notes v0.5.0

### Version Highlights
- Transitioned from release candidate (0.5.0-rc.9) to stable release
(0.5.0)
- Updated Typegraph version to 0.0.4

### New Features
- Added support for namespaces in TypeMeta struct
- Enhanced version management and validation processes
- Introduced new configuration module for synchronization processes
- Added asynchronous function for downloading CLI tools
- New test suite for validating SDK functionality
- New end-to-end test for Typegate upgrade process

### Improvements
- Refined environment configuration management
- Updated SDK and runtime configurations across multiple platforms
- Improved error handling in version upgrade processes
- Enhanced logging and output precision in test results

### Breaking Changes
- Removed `METATYPE_VERSION` constant
- Modified version constants and import paths
- Updated type definitions in some modules

### Compatibility
- Compatible with Deno, Node.js, and Python runtimes
- Supports latest SDK and CLI versions

### Upgrade Recommendations
- Recommended to update all dependencies to 0.5.0
- Review and adjust any custom configurations
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>


### Performance

<details >
<summary>
Use predefined function for context check policies (<a href="https://github.com/metatypedev/metatype/pull/959">#959</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

Improve performance by running the functions in the main thread when it
can be done securely:
- Use predefined function for context check policies
- Use context check policy for `admin_only`

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Release Notes

- **New Features**
  - Enhanced predefined function handling with optional parameters.
  - Introduced a more flexible context checking mechanism.
  - Simplified policy definition for admin access.

- **Improvements**
  - Updated runtime function registration process.
  - Improved type safety for predefined function validation.
  - Streamlined error handling for function materialization.

- **Changes**
  - Removed deprecated error handling functions.
  - Modified internal representations of predefined functions.
  - Updated function signatures for predefined Deno functions.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>


## [v0.5.0-rc.9](https://github.com/metatypedev/metatype/releases/tag/v0.5.0-rc.9) - 2024-12-25

### Bug Fixes

<details >
<summary>
Broken deno runtime secret injection (<a href="https://github.com/metatypedev/metatype/pull/946">#946</a>)
</summary>

- Bumps to 0.5.0-rc.9
- Fixes bug with deno secret injection

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Features

<details open>
<summary>
(gate,sdk) New policy spec (<a href="https://github.com/metatypedev/metatype/pull/937">#937</a>)
  - BREAKING: new policy spec (<a href="https://github.com/metatypedev/metatype/pull/937">#937</a>)
</summary>

#### Migration notes

* Replaced true, false, and null to ALLOW, DENY and PASS.

Composition rules:
1. On traversal order:

* `ALLOW`: allow parent and all its children (ignore inner policies)
* `DENY`: deny parent and all its children  (ignore inner policies)
* `PASS`: pass through parent and evaluate each children (no-op,
equivalent to no policies)

2. On a single type (a.with_policy(X).with_policy(Y)):

`ALLOW` and `DENY` compose the same as true and false with the AND gate,
`PASS` does not participate.
* `ALLOW` & P = P
* `DENY` & P = `DENY` (e.g. DENY & ALLOW = DENY)
* `PASS` & P = P (does not participate)

- [x] The change comes with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

## Release Notes

- **New Features**
- Enhanced documentation for Metatype's mental model, including clearer
policy definitions and a comparison table with classical models.
- Introduction of a comprehensive tutorial on building a Metatype API,
covering setup, CRUD operations, and security practices.

- **Bug Fixes**
- Updated policy logic to return explicit 'ALLOW' or 'DENY' strings
instead of boolean values across various components.

- **Documentation**
- Improved clarity and detail in documentation for policies and core
concepts.
	- Added new sections for policy composition rules and traversal order.

- **Refactor**
- Streamlined policy management and evaluation logic across multiple
files, enhancing clarity and maintainability.

- **Tests**
- Added tests for new policy functionalities and updated existing tests
to reflect changes in policy handling.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>


## [v0.5.0-rc.8](https://github.com/metatypedev/metatype/releases/tag/v0.5.0-rc.8) - 2024-12-16

### Bug Fixes

<details >
<summary>
(gate) Cache deno imports on deploy (<a href="https://github.com/metatypedev/metatype/pull/925">#925</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Fixes
[MET-766](https://linear.app/metatypedev/issue/MET-766/typescript-import-caching-and-validation-on-deploy)
and
[MET-746](https://linear.app/metatypedev/issue/MET-746/deno-runtime-timeouts-on-error)

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
(metagen) Client file upload fixup (<a href="https://github.com/metatypedev/metatype/pull/936">#936</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Make reusable file on multiple path for python and added tests for TS
and Python.

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Type duplication bug (<a href="https://github.com/metatypedev/metatype/pull/938">#938</a>)
</summary>

- Fixes bug in type-deduplication impl.
- Fixes issues with very long names generated by prisma where types.
- [x] Fix bug where duplicate names end up in typegraph
- [x] Tests to avoid type size and duplication regressions
- Bumps version to 0.5.0-rc.8

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Features

<details >
<summary>
(metagen) Python client file upload (<a href="https://github.com/metatypedev/metatype/pull/931">#931</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Closes
[MET-769](https://linear.app/metatypedev/issue/MET-769/add-file-upload-support-for-python-metagen-client)

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(metagen) Typescript client file upload (<a href="https://github.com/metatypedev/metatype/pull/934">#934</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Closes
[MET-768](https://linear.app/metatypedev/issue/MET-768/add-file-upload-support-for-typescript-metagen-client).

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(subs,deno) Advanced filters + context util + replay aware logger (<a href="https://github.com/metatypedev/metatype/pull/930">#930</a>)
</summary>

Solves
[MET-720](https://linear.app/metatypedev/issue/MET-720/subs-advanced-filters-for-workflows),
[MET-749](https://linear.app/metatypedev/issue/MET-749/subs-durable-logger)
and
[MET-760](https://linear.app/metatypedev/issue/MET-760/gate-allow-user-to-fetchdebug-the-context-easily).

#### Basic overview
Given an expression tree, a field can represent either an operator
(e.g., and, or, lte, etc.) or a 'special' field (started_at, ended_at,
status).

We can now answer queries such as: 'List all failed runs that started
between x and y but did not end at z, where the value is not null, or
alternatively completed but returned null'

</details>
<details >
<summary>
Injection on output types (outjection) (<a href="https://github.com/metatypedev/metatype/pull/935">#935</a>)
</summary>

- [x] Solve
[MET-140](https://linear.app/metatypedev/issue/MET-140/gate-computestage-processing-from-context-should-evaluate-in-all-cases)
  - Enable injection on output
- [x] Solve
[MET-47](https://linear.app/metatypedev/issue/MET-47/gate-from-parent-for-eitherunion)
  - test from parent injection for either/union types

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes
- _N/A_

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Miscellaneous Tasks

<details >
<summary>
Improve ux, installer (<a href="https://github.com/metatypedev/metatype/pull/932">#932</a>)
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

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


## [v0.5.0-rc.7](https://github.com/metatypedev/metatype/releases/tag/v0.5.0-rc.7) - 2024-11-28

### Bug Fixes

<details >
<summary>
Fix secret hydration (<a href="https://github.com/metatypedev/metatype/pull/918">#918</a>)
</summary>

- Fix secret hydration
- Fix Google OAuth2 profile type

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes
_N/A_

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Features

<details >
<summary>
(metagen) Add file upload support for Rust client (<a href="https://github.com/metatypedev/metatype/pull/893">#893</a>)
</summary>

Solve
[MET-629](https://linear.app/metatypedev/issue/MET-629/client-add-support-for-file-uploads)
(Part 1)
- Add file upload support to Rust metagen client

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

_N/A_


- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details open>
<summary>
(sdk) Unify JS/TS imports (<a href="https://github.com/metatypedev/metatype/pull/926">#926</a>)
  - BREAKING: unify JS/TS imports (<a href="https://github.com/metatypedev/metatype/pull/926">#926</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

Solves
[MET-737](https://linear.app/metatypedev/issue/MET-737/unify-the-import-maps-across-package-registries-and-js-runtimes):
- [x] Unify JS/TS imports
- [ ] ~Add more test for the published packages: test JSR and NPM
packages on Nodejs and Deno, with the same typegraph definitions.~ (*on
a follow-up PR after the next release*)
- [x] Prepare for version 0.5.0-rc.7

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

*BREAKING CHANGES*:
- TypeScript SDK imports for should be changed on Deno, removing the
`.ts` extension:
  - `@typegraph/sdk/index.ts` --> `@typegraph/sdk`
  - `@typegraph/sdk/*.ts` --> `@typegraph/sdk/*`

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Miscellaneous Tasks

<details open>
<summary>
Remove meta-lsp (<a href="https://github.com/metatypedev/metatype/pull/903">#903</a>)
  - BREAKING: remove meta-lsp (<a href="https://github.com/metatypedev/metatype/pull/903">#903</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Remove meta-lsp and all parts related to it.
([MET-722](https://linear.app/metatypedev/issue/MET-722/lsp-clean-up-or-keep))

<!-- 2. Explain WHY the change cannot be made simpler -->

- ...

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

---------

</details>


## [v0.5.0-rc.6](https://github.com/metatypedev/metatype/releases/tag/v0.5.0-rc.6) - 2024-11-14

### Bug Fixes

<details >
<summary>
(cli) Implement `--prefix` argument (<a href="https://github.com/metatypedev/metatype/pull/913">#913</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Fixes
[MET-738](https://linear.app/metatypedev/issue/MET-738/implement-prefix-in-meta-serialize).

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(cli) Deployment after reloading config (<a href="https://github.com/metatypedev/metatype/pull/917">#917</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Fixes typegraph deployment bug using `meta dev` after changing
`metatype.yml` and added more watcher tests.


<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(subs) Disable save/kwargs mutation + better `LOG_LEVEL`  (<a href="https://github.com/metatypedev/metatype/pull/915">#915</a>)
</summary>

Tackles
[MET-724](https://linear.app/metatypedev/issue/MET-724/subs-bug-disable-user-ability-to-mutate-input)
and
[MET-730](https://linear.app/metatypedev/issue/MET-730/quiet-down-substantial-logging)
.

* A reference to `run.kwargs` should not be exposed directly, the
`kwargs` used by the user should be a deep copy.
* save now returns a deep copy of the returned value
*  noisy debug logs on substantial agent (disabled by default)


#### Migration notes

`save` will always refer to a deep clone of a value throughout the
initial run/replay.
```ts
const example = await ctx.save(() => someRef);
someRef.field = "changed!"; // will not affect example
```


- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

---------

</details>
<details >
<summary>
Remove prisma count (<a href="https://github.com/metatypedev/metatype/pull/916">#916</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Remove prisma count operation: it does not work, making it work like
on the prisma client would complicate the prisma runtime (until we have
output transformations...); Use aggregate instead.
- Increase the delay before exiting the process on the nodejs typegraph
client to give the CLI time to process all the output.
- Remove `quaint` logs on the typegate (too verbose).

<!-- 2. Explain WHY the change cannot be made simpler -->


<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Documentation

<details >
<summary>
`/docs/reference/graphql` (<a href="https://github.com/metatypedev/metatype/pull/875">#875</a>)
</summary>

- Adds page `/docs/reference/graphql`

---------

</details>


## [v0.5.0-rc.5](https://github.com/metatypedev/metatype/releases/tag/v0.5.0-rc.5) - 2024-11-10

### Bug Fixes

<details >
<summary>
Meta dev does not exit properly upon `SIGTERM` (<a href="https://github.com/metatypedev/metatype/pull/895">#895</a>)
</summary>

#### Migration notes

None

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Fix optional field filter in apply (<a href="https://github.com/metatypedev/metatype/pull/909">#909</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Fix the optional field filter on apply: resolve types before matching.

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes
_No migrations needed._

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Documentation

<details >
<summary>
Grpc annoucement blog (<a href="https://github.com/metatypedev/metatype/pull/872">#872</a>)
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


### Features

<details >
<summary>
(cli) Watch artifacts (<a href="https://github.com/metatypedev/metatype/pull/897">#897</a>)
</summary>

- Solve [MET
710](https://linear.app/metatypedev/issue/MET-710/watch-artifacts).

<!-- 2. Explain WHY the change cannot be made simpler -->

- ...

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Substantial function secrets support (<a href="https://github.com/metatypedev/metatype/pull/908">#908</a>)
</summary>

- Add support for passing secrets to substantial workflows
- Bump version to 0.5.0-rc5

---

- [x] The change comes with new or modified tests

</details>


### Miscellaneous Tasks

<details open>
<summary>
License change to MPL Version 2.0 (<a href="https://github.com/metatypedev/metatype/pull/899">#899</a>)
  - BREAKING: license change to MPL Version 2.0 (<a href="https://github.com/metatypedev/metatype/pull/899">#899</a>)
</summary>

#### Migration notes

All license headers has changed to MPL 2.0.

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

---------

</details>


## [v0.5.0-rc.4](https://github.com/metatypedev/metatype/releases/tag/v0.5.0-rc.4) - 2024-11-05

### Bug Fixes

<details >
<summary>
(typegraph) Send rpc message in chunks in the TS typegraph client  (<a href="https://github.com/metatypedev/metatype/pull/904">#904</a>)
</summary>

- Send the JSON-RPC message is chunks in the TypeScript typegraph client
to prevent reaching the line size limit for stdout. Note: we could not
reproduce the issue locally as it only occurs when using the published
package for Node.js.
- Use JSON-RPC notification for logging and report from the typegraph
clients.
- Other changes:
  - Use relative paths for static task sources in the CLI;
- Fix TODO in `meta gen`: pass the working directory on the
`working_dir` param of `SerializeActionGenerator::new`.

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes
_N/A_

---

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Speculative fix for `typegate_prisma_test.ts` (<a href="https://github.com/metatypedev/metatype/pull/898">#898</a>)
</summary>

- Assigns special schemas for each test that relies on the
`runtimes/prisma/prisma.py` typegraph.
- Bumps version tag to 0.5.0-rc4
- Fixes issues in release pipeline
- Disables all but the `test-full` job when the test pipeline is run
with tmate enabled.

The flakeout of `typegate_prisma_test.ts` has proved difficult to
recreate. Looking at the code and going from recent similar cases, I
suspect it happens due to the old code reusing the same pg schema for
multiple tests. Assigning special schemas for each tests should
hopefully help.


#### Migration notes

N/A

---

- [x] The change comes with new or modified tests

---------

</details>


## [v0.5.0-rc.3](https://github.com/metatypedev/metatype/releases/tag/v0.5.0-rc.3) - 2024-10-30

### Bug Fixes

<details >
<summary>
Update license file (<a href="https://github.com/metatypedev/metatype/pull/890">#890</a>)
</summary>

# PR Summary
Commit d84e4ed6c3f88d52c95f1491a050daa924e14b87 moved the
`LICENSE-MPL-2.0.md` file. This PR adjusts sources to changes.

#### Migration notes

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Minor bug fixes (<a href="https://github.com/metatypedev/metatype/pull/894">#894</a>)
</summary>

- Bug with typegraph context reset around deno_modules
- Bug with typegate onPush hook error detection and typegraph parsing of
such errors
- Bug with artifact resolution when they're reused.
- Bug with return type of the KvRuntime get functions
- Bumps metatype to 0.5.0-rc.3

#### Migration notes

N/A

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Documentation

<details >
<summary>
Add substantial (<a href="https://github.com/metatypedev/metatype/pull/891">#891</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- docs

<!-- 2. Explain WHY the change cannot be made simpler -->

- N/A

<!-- 3. Explain HOW users should update their code -->

#### Migration 

N/A

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


## [v0.5.0-rc.2](https://github.com/metatypedev/metatype/releases/tag/v0.5.0-rc.2) - 2024-10-24

### Bug Fixes

<details >
<summary>
Fix `.apply` serialization error with optional structs (<a href="https://github.com/metatypedev/metatype/pull/886">#886</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Fix the error on `.apply` when the apply tree goes beyond an optional
struct, mostly changing the implementation of `resolve_optional` method.
- Improve the errors when we encounter an exception raise by
`Result::Err` from typegraph_core.

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

...

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Features

<details >
<summary>
Add GraphQL alias support for prisma runtime (<a href="https://github.com/metatypedev/metatype/pull/887">#887</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Add GraphQL alias support for prisma runtime

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

...

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


## [v0.5.0-rc.1](https://github.com/metatypedev/metatype/releases/tag/v0.5.0-rc.1) - 2024-10-22

### Bug Fixes

<details >
<summary>
(ci) Disable sccache when secrets not avail (<a href="https://github.com/metatypedev/metatype/pull/874">#874</a>)
</summary>

- Makes sccache optional so PRs from dependabot and forks can still run
the test suite.
- Increases sccache allotment to 50g.

---------

</details>
<details >
<summary>
(cli) Change default installation directory (<a href="https://github.com/metatypedev/metatype/pull/873">#873</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Remplacement PR for #843.

<!-- 2. Explain WHY the change cannot be made simpler -->

- ...

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
(docs) Grpc docs (<a href="https://github.com/metatypedev/metatype/pull/852">#852</a>)
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
<details >
<summary>
(gate) Make __typename returns the variant name on unions (<a href="https://github.com/metatypedev/metatype/pull/838">#838</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

- Add missing implementation for static injection for parameter
transformations on the typegate
- Solves
[MET-642](https://linear.app/metatypedev/issue/MET-642/gate-typename-on-union-selections-should-hold-member-title):
Fix the `__typename` result on union variants: return the variant name
instead of the parent type name

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

N/A

#### Checklist

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(subs) Key collision on redis (<a href="https://github.com/metatypedev/metatype/pull/865">#865</a>)
</summary>

Follow up of #863
When multiple start occurs for redis, some schedules can happen
**exactly** at the same time resulting into the same identifier (and
leading to an inconsistent state).

This solution simply combines the `schedule` with the run_id making it
unique instead of using it as is.

```gql
mutation AllAtOnce {
  a: start_retry(kwargs: { .. }) # => calls add_schedule( ... date ...)
  b: start_retry(kwargs: { .. })
  c: start_retry(kwargs: { .. })
  d: start_retry(kwargs: { .. }) 
  e: start_retry(kwargs: { .. })
  f: start_retry(kwargs: { .. })
 # ..
}
```

#### Migration notes

None

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Fix missing images (<a href="https://github.com/metatypedev/metatype/pull/847">#847</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

## Fix missing images for `durable execution` blog

<!-- 2. Explain WHY the change cannot be made simpler -->

-

<!-- 3. Explain HOW users should update their code -->

#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Improve name generation for prisma types (<a href="https://github.com/metatypedev/metatype/pull/849">#849</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

Solve
[MET-657](https://linear.app/metatypedev/issue/MET-657/sdk-improve-generated-titles-for-prisma-types)

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Documentation

<details >
<summary>
(blog) Running python with WebAssembly part 1 (<a href="https://github.com/metatypedev/metatype/pull/823">#823</a>)
</summary>

Running python with webassembly (part 1)

#### Migration notes

None

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Summary by CodeRabbit

- **New Features**
- Introduced a comprehensive guide for integrating Python runtime with
WebAssembly (WASI) in the Metatype ecosystem.
- Detailed the advantages of using WebAssembly over Docker for platform
independence and resource management.
- Provided technical requirements and a refined solution for executing
Python scripts in a sandboxed environment.
- Expanded vocabulary with new relevant terms for enhanced text
processing and validation.

- **Documentation**
- Updated YAML configuration structure in documentation for clarity on
type gate usage.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---------

</details>
<details >
<summary>
`/docs/reference/typegraph/client`  (<a href="https://github.com/metatypedev/metatype/pull/777">#777</a>)
</summary>

Pre-documentation for the code-first queries feature.

#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Features

<details >
<summary>
(dev) Typegraph explorer (<a href="https://github.com/metatypedev/metatype/pull/859">#859</a>)
</summary>

- Add a web version of tree-view which is more interactive
- Enable typegraph serialization without `metatype.yml` config file


![image](https://github.com/user-attachments/assets/81771c07-1f2a-493a-81df-969c8182f9bf)

</details>
<details >
<summary>
(gate) Empty object as custom scalar (<a href="https://github.com/metatypedev/metatype/pull/876">#876</a>)
</summary>

* Allow empty object on the output without any change
* Just like `Int`, `String`, and such, rightfully refer the constant
`{}` as a scalar
* **Any** empty object will now be refered as  `EmptyObject` scalar

#### Migration notes

None

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(mdk) Overridable templates (<a href="https://github.com/metatypedev/metatype/pull/842">#842</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

Solve
[MET-630](https://linear.app/metatypedev/issue/MET-630/gen-add-parameter-to-replace-static-sections)
- [x] Make templates in the _static_ sections overridable
  - [x] `mdk_rust`
  - [x] `mdk_python`
  - [x] `mdk_typescript`
- [x] Add a CLI tool to generate extract the default template


<!-- 3. Explain HOW users should update their code -->

#### Migration notes

No changes needed.

---

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(metagen) Union/either for clients (<a href="https://github.com/metatypedev/metatype/pull/857">#857</a>)
</summary>

- Add union support for the `client_xx` metagen implementations.

There are still some edge cases especially around variant identification
in the client languages. I tried many things but our hands are tied by
serde. Basically, users will have to be careful when designing their
union types to avoid ambiguity cases. Hopefully,
[674](https://linear.app/metatypedev/issue/MET-674/graph-checksvalidation-on-teither)
will help there.

#### Migration notes

...

- [x] The change comes with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Introduced new methods for rendering union types in both TypeScript
and Python.
- Enhanced GraphQL query generation with support for multiple union
types.
- Added a new `variants` property to the `NodeMeta` type for improved
selection handling.
  
- **Bug Fixes**
	- Improved error handling for node selections and argument processing.

- **Tests**
- Updated test cases to reflect schema changes and added new tests for
client functionality.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
(subs) Redis backend (<a href="https://github.com/metatypedev/metatype/pull/855">#855</a>)
</summary>

* Redis Backend base logic port + some improvements
* Moved `SUBSTANTIAL_POLL_INTERVAL_SEC` and
`SUBSTANTIAL_LEASE_LIFESPAN_SEC` to config

#### Migration notes
* Renamed `Backend.fs()` and `Backend.memory()` to `Backend.dev_fs()`
and `Backend.dev_memory()`
* Removed `SUBSTANTIAL_RELAUNCH_MS` as it was relevant only for purely
worker-based runs, which rendered the new
`SUBSTANTIAL_POLL_INTERVAL_SEC` redundant when an interrupt hits.

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

## Release Notes

- **New Features**
- Introduced Redis as a new backend option for enhanced data management.
	- Added Docker Compose configuration for a Redis service.
- Implemented comprehensive testing for Redis functionality and backend
integration.

- **Bug Fixes**
	- Improved error handling during backend initialization.

- **Documentation**
- Updated type definitions for backend configurations to streamline
Redis integration.

- **Chores**
- Refactored test cases for clarity and consistency across different
backend types.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
(subs) Retry + timeout on save (<a href="https://github.com/metatypedev/metatype/pull/863">#863</a>)
</summary>

Port and improve retry/timeout.

#### Migration notes

N/A

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(subs) Child workflows + docs (<a href="https://github.com/metatypedev/metatype/pull/867">#867</a>)
</summary>

Support for child workflows.

Solves MET-689 and MET-668.

#### Migration notes

Previously
```python
    sub = SubstantialRuntime(backend)
    hello = sub.deno(file="workflow.ts", name="sayHello", deps=[])

    g.expose(
      # each function start, stop, result, ... holds a copy of the workflow data
       start_hello = hello.start(...),
       stop_hello = hello.stop()
    )
```
This approach relied on workflow files being referenced in each
materializer, but the constructs were too restrictive to support
something like `mutation { results(name: "nameManuallyGiven") }`.

We now have instead
```python
    file = (
       WorkflowFile
           .deno(file="workflow.ts", deps=[])
           .import_(["sayHello"])
           .build()
    )

    # workflow data are refered only once
    sub = SubstantialRuntime(backend, [file])
    g.expose(
      start_hello = sub.start(...).reduce({ "name": "sayHello" }),
      stop = sub.stop()
    )
```

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
(subs,gate) Substantial integration (<a href="https://github.com/metatypedev/metatype/pull/844">#844</a>)
</summary>



</details>
<details >
<summary>
(subs,gate) Port agent concept (<a href="https://github.com/metatypedev/metatype/pull/845">#845</a>)
</summary>

Continuation of #844

</details>
<details >
<summary>
Well-defined type comparison semantics (<a href="https://github.com/metatypedev/metatype/pull/846">#846</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

Solve
[MET-655](https://linear.app/metatypedev/issue/MET-655/sdk-improve-the-ensuresubtypeof-implementation)
- [x] Document the type comparison semantics
- [x] Improve the implementation (`EnsureSubtypeOf` trait) 
- [x] Add more test cases for type comparisons

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

_No change is needed._

...

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

## Release Notes

- **New Features**
- Introduced comprehensive type comparison rules and semantics for
scalar types, optionals, lists, objects, and unions.
- Added support for enumerated types in the type system, allowing for
more precise type definitions.
- Enhanced parent injection mechanism documentation to clarify type
compatibility requirements.
- Implemented a new suite of type comparison tests and validation
mechanisms.

- **Bug Fixes**
- Improved error reporting and handling in the type validation process.

- **Documentation**
- Updated and expanded documentation for type comparisons, enumerations,
and parent injections.

- **Tests**
  - Added new tests for type comparison and validation scenarios.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

</details>
<details >
<summary>
Grpc runtime (<a href="https://github.com/metatypedev/metatype/pull/819">#819</a>)
</summary>

#### Migration notes

...

- [x] The change comes with new or modified tests
- [X] End-user documentation is updated to reflect the change
- [ ] Hard-to-understand functions have explanatory comments

---------

</details>
<details >
<summary>
Python hostcall (<a href="https://github.com/metatypedev/metatype/pull/860">#860</a>)
</summary>

Dead lock on python worker

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

<details open>
<summary>
Checks/validation on t.either (<a href="https://github.com/metatypedev/metatype/pull/868">#868</a>)
  - BREAKING: Checks/validation on t.either (<a href="https://github.com/metatypedev/metatype/pull/868">#868</a>)
</summary>

Emit a warning or an error when a variant is a subtype of another one.

#### Migration notes
**BREAKING CHANGE**: Previously valid typegraph might fail validation.
You will need to fix your types to add some consistency in
`t.either`/`t.union` types.

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Update prisma + deno + rust deps (<a href="https://github.com/metatypedev/metatype/pull/869">#869</a>)
</summary>

- Bump deno to 1.46.3
- Update prisma-engines to 5.20
- Update other rust deps.

Closes MET-669 and MET-622 and MET-680.

#### Migration notes

...

- [ ] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>


### Refactor

<details >
<summary>
(gate) Add err msg for missing env vars (<a href="https://github.com/metatypedev/metatype/pull/827">#827</a>)
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
<details >
<summary>
(gate) Use stream during artifact upload to s3 (<a href="https://github.com/metatypedev/metatype/pull/841">#841</a>)
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
<details >
<summary>
(gen, doc) Rename mdk to fdk (<a href="https://github.com/metatypedev/metatype/pull/851">#851</a>)
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
<details open>
<summary>
(sdk) Remove index based names (<a href="https://github.com/metatypedev/metatype/pull/848">#848</a>)
  - BREAKING: remove index based names (<a href="https://github.com/metatypedev/metatype/pull/848">#848</a>)
</summary>

- Replace index based names for types by one that relies on type context
in graph
- Tests for type deduplication

#### Migration notes

TODO

- [x] The change comes with new or modified tests
- [ ] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>
<details open>
<summary>
Move as_id out of `TypeNode` (<a href="https://github.com/metatypedev/metatype/pull/866">#866</a>)
  - BREAKING: Move as_id out of `TypeNode` (<a href="https://github.com/metatypedev/metatype/pull/866">#866</a>)
</summary>

<!--
Pull requests are squashed and merged using:
- their title as the commit message
- their description as the commit body

Having a good title and description is important for the users to get
readable changelog.
-->

<!-- 1. Explain WHAT the change is about -->

Solve
[MET-684](https://linear.app/metatypedev/issue/MET-684/store-the-id-field-in-tstruct-instead-of-in-the-target-type-as-id)
and
[MET-471](https://linear.app/metatypedev/issue/MET-471/parent-injection-use-property-name-instead-of-function-name)
- **common/typegraph**
- [x] Store the id field in `ObjectTypeData` instead of in the target
type (`as_id`)
  - [x] Add `id()` method on `t.integer` and `t.string`
- **typegraph/core**
  - [x] Store `as_id`, `injection` and `policy` in `TypeRef::attribute`
  - [x] Add support for direct and link target in `TypeRef`
  - [x] Only allow name registration for `TypeDef`
- Semantics
- [x] Use property name instead of type name in from_parent injection
source

#### Migration notes
**BREAKING CHANGE**
`from_parent` injections source shall be changed to the key in the
parent `t.struct` instead of the type name.


#### Checklist

- [x] The change comes with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [x] End-user documentation is updated to reflect the change

</details>
<details >
<summary>
Move injection data to `t.func` (<a href="https://github.com/metatypedev/metatype/pull/871">#871</a>)
</summary>

-
[MET-682](https://linear.app/metatypedev/issue/MET-682/move-all-injection-data-to-tfunc)
  - [x] Move all injection data in `ObjectTypeData` (i.e. `t.func`)
-
[MET-656](https://linear.app/metatypedev/issue/MET-656/sdk-improve-generated-titles-from-applyreduce)
  - [x] Translate reduce to injection specification on `t.func`
-
[MET-94](https://linear.app/metatypedev/issue/MET-94/remove-runtime-field-from-typenode)
  - [x] Remove runtime field from `TypeNode` (<a href="https://github.com/metatypedev/metatype/pull/858">#858</a>)
-
[MET-683](https://linear.app/metatypedev/issue/MET-683/move-runtime-related-type-configs-out-of-typenode)
- [x] Move runtime-related configs to `MaterializerData` or
`RuntimeData`
- Misc.
- Enable random ports for the typegate (when `TG_PORT=0`); this will
work with `meta dev` with embedded typegate if you set the `--gate`
option with port `0`.

<!-- 2. Explain WHY the change cannot be made simpler -->



<!-- 3. Explain HOW users should update their code -->

#### Migration notes

...

- [x] The change comes with new or modified tests
- [x] Hard-to-understand functions have explanatory comments
- [ ] End-user documentation is updated to reflect the change

</details>



