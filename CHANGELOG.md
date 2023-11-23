# Changelog

All notable changes to this project will be documented in this file.

## [unreleased]

### Bug Fixes

<details >
<summary>
Fix lock.yml ([#459](https://github.com/metatypedev/metatype/pull/459))
</summary>

Fix lock.yml to set WASM_OPT_VERSION in whiz.yaml

</details>


### Features

<details >
<summary>
Pre-registered public policy ([#461](https://github.com/metatypedev/metatype/pull/461))
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
(gate) Explicit null on query arg ([#453](https://github.com/metatypedev/metatype/pull/453))
</summary>

Solves MET-268 + fixes an edgecase for "weak validation"

</details>


### Features

<details >
<summary>
(gate,sdk) Update auth interface, better oauth2 ([#447](https://github.com/metatypedev/metatype/pull/447))
</summary>



</details>
<details >
<summary>
Remove injected fields from generated types for prisma operations ([#448](https://github.com/metatypedev/metatype/pull/448))
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
Upgrade wasm-opt ([#456](https://github.com/metatypedev/metatype/pull/456))
</summary>



</details>


## [v0.2.2](https://github.com/metatypedev/metatype/releases/tag/v0.2.2) - 2023-10-11

### Bug Fixes

<details >
<summary>
(gate) Script reload while gate is running ([#441](https://github.com/metatypedev/metatype/pull/441))
</summary>



</details>


### Features

<details >
<summary>
(sdk) Change rest queries interface ([#444](https://github.com/metatypedev/metatype/pull/444))
</summary>



</details>
<details >
<summary>
Stability fixes ([#442](https://github.com/metatypedev/metatype/pull/442))
</summary>



</details>
<details >
<summary>
Wasm + change effect none to read ([#443](https://github.com/metatypedev/metatype/pull/443))
</summary>



</details>


## [v0.2.1](https://github.com/metatypedev/metatype/releases/tag/v0.2.1) - 2023-10-05

### Bug Fixes

<details >
<summary>
Update rename logic ([#439](https://github.com/metatypedev/metatype/pull/439))
</summary>

Duplicate the store entry instead of referencing.

</details>


### Refactor

<details >
<summary>
(typegraph_core) Simplify private rust SDK ([#432](https://github.com/metatypedev/metatype/pull/432))
</summary>



</details>


## [v0.2.0](https://github.com/metatypedev/metatype/releases/tag/v0.2.0) - 2023-10-04

### Bug Fixes

<details >
<summary>
(gate) Introspection if func has the same input/output ([#431](https://github.com/metatypedev/metatype/pull/431))
</summary>



</details>
<details >
<summary>
(sdk,deno,python) Generate func from frontend + prisma deno frontend ([#416](https://github.com/metatypedev/metatype/pull/416))
</summary>



</details>


### Features

<details >
<summary>
(core) Set runtime field in types ([#398](https://github.com/metatypedev/metatype/pull/398))
</summary>



</details>
<details >
<summary>
(sdk) Add wasmedge runtime ([#397](https://github.com/metatypedev/metatype/pull/397))
</summary>



</details>
<details >
<summary>
(sdk) Random runtime ([#396](https://github.com/metatypedev/metatype/pull/396))
</summary>

* +runtime_config

</details>
<details >
<summary>
(sdk) Implement injection ([#403](https://github.com/metatypedev/metatype/pull/403))
</summary>



</details>
<details >
<summary>
(sdk) Rate limiting, cors, etc.. ([#411](https://github.com/metatypedev/metatype/pull/411))
</summary>



</details>
<details >
<summary>
(sdk) Add the prisma runtime to the new SDK ([#395](https://github.com/metatypedev/metatype/pull/395))
</summary>



</details>
<details >
<summary>
(sdk) Apply syntax ([#410](https://github.com/metatypedev/metatype/pull/410))
</summary>



</details>
<details >
<summary>
(sdk) Temporal runtime ([#413](https://github.com/metatypedev/metatype/pull/413))
</summary>



</details>
<details >
<summary>
(sdk) Custom query exec for prisma runtime ([#419](https://github.com/metatypedev/metatype/pull/419))
</summary>



</details>
<details >
<summary>
Fix nightly ([#402](https://github.com/metatypedev/metatype/pull/402))
</summary>



</details>
<details >
<summary>
V0.2.x series + upgrades ([#417](https://github.com/metatypedev/metatype/pull/417))
</summary>



</details>
<details >
<summary>
Upgrade jco and prepare sdk build ([#420](https://github.com/metatypedev/metatype/pull/420))
</summary>



</details>
<details >
<summary>
Sdk build with wasm ([#421](https://github.com/metatypedev/metatype/pull/421))
</summary>



</details>
<details >
<summary>
Add `typedef.rename()` method ([#426](https://github.com/metatypedev/metatype/pull/426))
</summary>



</details>
<details >
<summary>
Release 0.2.0 ([#434](https://github.com/metatypedev/metatype/pull/434))
</summary>



</details>


### Miscellaneous Tasks

<details >
<summary>
Migrate all the test typegraphs to the new Python SDK ([#418](https://github.com/metatypedev/metatype/pull/418))
</summary>



</details>
<details >
<summary>
Migrate doc typegraphs ([#429](https://github.com/metatypedev/metatype/pull/429))
</summary>



</details>
<details >
<summary>
Remove old typegraph sdk ([#430](https://github.com/metatypedev/metatype/pull/430))
</summary>



</details>
<details >
<summary>
Check that all interfaces are implemented in both sdk ([#435](https://github.com/metatypedev/metatype/pull/435))
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
Make `with_store` and `with_store_mut` private in `global_store` module ([#414](https://github.com/metatypedev/metatype/pull/414))
</summary>



</details>


## [v0.1.14](https://github.com/metatypedev/metatype/releases/tag/v0.1.14) - 2023-08-22

### Bug Fixes

<details >
<summary>
Fix link to LICENSE.md in README.md ([#394](https://github.com/metatypedev/metatype/pull/394))
</summary>



</details>
<details >
<summary>
Test with git ([#399](https://github.com/metatypedev/metatype/pull/399))
</summary>



</details>


### Features

<details >
<summary>
(gate) Deno worker should timeout internal functions to avoid infinite loop or similar ([#375](https://github.com/metatypedev/metatype/pull/375))
</summary>

Attempt solving MET-120.

There seems to be an issue when using `setTimeout` and `setInterval` in
tests even if they are 'properly' cleared. (some might be cancelled
prematurely?)
```
Deno runtime ... should work with async function => ./typegate/tests/utils/test.ts:148:30
error: Leaking async ops:
  - 1 async operation to sleep for a duration was started before this test, but was completed during the test. Async operations should not complete in a test if they were not started in that test.
            This is often caused by not cancelling a `setTimeout` or `setInterval` call.
```

I also tried using an external sleep source like `$ sleep 1s` but it
seems to have similar issues
```
error: Leaking resources:
  - A child process stdout (rid 158) was opened before the test started, but was closed during the test. Do not close resources in a test that were not created during that test.
```

[Update]
Disable `sanitizeOps` while making sure all resources are closed
properly.
```typescript
Meta.test("test title", async (t) => {
  // test body
}, { sanitizeOps: false });
```

---------

</details>
<details >
<summary>
(sdk) Implement all types ([#380](https://github.com/metatypedev/metatype/pull/380))
</summary>

Solves MET-213

---------

</details>
<details >
<summary>
(sdk) Python wasi runtime ([#392](https://github.com/metatypedev/metatype/pull/392))
</summary>

This solves MET-216

</details>
<details >
<summary>
(typegraph-next) Add GraphQL runtime support ([#388](https://github.com/metatypedev/metatype/pull/388))
</summary>

Solves [MET-217](https://metatype.atlassian.net/browse/MET-217).

</details>
<details >
<summary>
(typegraph/sdk) Add Http runtime ([#391](https://github.com/metatypedev/metatype/pull/391))
</summary>

Solve [MET-215](https://metatype.atlassian.net/browse/MET-215).

</details>
<details >
<summary>
Replace number with float ([#390](https://github.com/metatypedev/metatype/pull/390))
</summary>

Related to #380

</details>
<details >
<summary>
Small improvements + meta doctor ([#387](https://github.com/metatypedev/metatype/pull/387))
</summary>



</details>


### Miscellaneous Tasks

<details >
<summary>
Release 0.1.14
</summary>



</details>


### Refactor

<details >
<summary>
(sdk) Change typegraph definition signature ([#389](https://github.com/metatypedev/metatype/pull/389))
</summary>

* Replace the expose argument with a `g` object
* Use decorator in python

</details>


## [v0.1.12](https://github.com/metatypedev/metatype/releases/tag/v0.1.12) - 2023-08-03

### Features

<details >
<summary>
More stable run by fixing little bugs + typegraph upgrade ([#384](https://github.com/metatypedev/metatype/pull/384))
</summary>



</details>


## [v0.1.11](https://github.com/metatypedev/metatype/releases/tag/v0.1.11) - 2023-08-02

### Bug Fixes

<details >
<summary>
Ensure hooks logging ([#357](https://github.com/metatypedev/metatype/pull/357))
</summary>

Solve [MET-174](https://metatype.atlassian.net/browse/MET-174)

This PR also makes some refactoring: `Register` did a lot more than
engine registration, so some logic needed to be extracted out, like
engine initialization, etc...

---------

</details>
<details >
<summary>
Enable introspection on system typegraphs ([#373](https://github.com/metatypedev/metatype/pull/373))
</summary>

Solves MET-209

</details>


### Documentation

<details >
<summary>
Documentation for types ([#348](https://github.com/metatypedev/metatype/pull/348))
</summary>



</details>
<details >
<summary>
Move some examples typegraph into how to guides reference or tests ([#374](https://github.com/metatypedev/metatype/pull/374))
</summary>

Solves MET-184

</details>


### Features

<details >
<summary>
(Deno) Support deno function defined in multiple files ([#345](https://github.com/metatypedev/metatype/pull/345))
</summary>

This implements MET-135

---------

</details>
<details >
<summary>
(gate) Generate openapi over rest endpoints ([#365](https://github.com/metatypedev/metatype/pull/365))
</summary>

This solves MET-205

</details>
<details >
<summary>
(wasi) Add support for python def and python module ([#360](https://github.com/metatypedev/metatype/pull/360))
</summary>

This solves MET-176 and MET-177

---------

</details>
<details >
<summary>
Improve SDKs and rest support ([#350](https://github.com/metatypedev/metatype/pull/350))
</summary>



</details>
<details >
<summary>
Wit component 3 ([#366](https://github.com/metatypedev/metatype/pull/366))
</summary>



</details>
<details >
<summary>
Customize the generated prisma schema with the target database ([#359](https://github.com/metatypedev/metatype/pull/359))
</summary>



</details>
<details >
<summary>
Improve installer script + release 0.1.11 ([#381](https://github.com/metatypedev/metatype/pull/381))
</summary>



</details>


## [v0.1.10](https://github.com/metatypedev/metatype/releases/tag/v0.1.10) - 2023-06-28

### Bug Fixes

<details >
<summary>
Fix injection for GraphQL runtime ([#333](https://github.com/metatypedev/metatype/pull/333))
</summary>

- Add selection fields for the dependencies in the remote query
- Use computed argument values instead of the original ones (to ensure
we have all the injected values)

</details>
<details >
<summary>
Fix migrations for target with prefix ([#344](https://github.com/metatypedev/metatype/pull/344))
</summary>

Solve [MET-198](https://metatype.atlassian.net/browse/MET-198)
* Use the same migration files for the same typegraph either the target
uses a prefix or not.

</details>


### Features

<details >
<summary>
Configure S3 in secrets ([#336](https://github.com/metatypedev/metatype/pull/336))
</summary>

Solves [MET-192](https://metatype.atlassian.net/browse/MET-192).

</details>
<details >
<summary>
Add oauth profiler, blog, comparison and small fixes ([#338](https://github.com/metatypedev/metatype/pull/338))
</summary>



</details>
<details >
<summary>
New typegraph SDK ([#337](https://github.com/metatypedev/metatype/pull/337))
</summary>

Solves [MET-178](https://metatype.atlassian.net/browse/MET-178).

- Typegraph definition in TypeScript/Deno and in Python

</details>


### Miscellaneous Tasks

<details >
<summary>
Release 0.1.10 ([#347](https://github.com/metatypedev/metatype/pull/347))
</summary>



</details>


## [v0.1.10-dev.0](https://github.com/metatypedev/metatype/releases/tag/v0.1.10-dev.0) - 2023-05-30

### Bug Fixes

<details >
<summary>
Website deployment
</summary>



</details>
<details >
<summary>
Env var
</summary>



</details>


### Features

<details >
<summary>
Remove cookie auth, fix typegraph detection, fix injection, add auth doc, add regression test for doc ([#327](https://github.com/metatypedev/metatype/pull/327))
</summary>



</details>


## [v0.1.9](https://github.com/metatypedev/metatype/releases/tag/v0.1.9) - 2023-05-26

### Bug Fixes

<details >
<summary>
All importers ([#311](https://github.com/metatypedev/metatype/pull/311))
</summary>

* fix field name

* fix regex pattern, add explicit nullable support

* patch anyOf, oneOf and unknown schema

* autogenerate name from method+path

* fix google discovery

* use Box _safe_attr()

* add support union/either

* fix nullable, deprecated

* add support url params

* fix tests

* fix unsupported operand

* add missing condition

* skip unsupported schema

---------

</details>
<details >
<summary>
Python typing error happening in `example.py` file ([#319](https://github.com/metatypedev/metatype/pull/319))
</summary>

* fix(python): use attr.field directly to please pyright

* fix(python): add type hint for @with_constraints

* fix(python): correctly type default_policy in TypeGraph.expose

</details>
<details >
<summary>
GitHub(Importer) and validate names ([#322](https://github.com/metatypedev/metatype/pull/322))
</summary>

* sanitize names

* throw if name invalid

</details>
<details >
<summary>
Add explicit error message ([#318](https://github.com/metatypedev/metatype/pull/318))
</summary>

* add explicit error message

* full lowercase

* change status to 4XX

* remove content-length requirement

* add missing Content-Type header for tests

* fix merge

* fix tests

* add test

* add undefined Content-Type test

---------

</details>


### Documentation

<details >
<summary>
(tuto) Typo and missing highlight line ([#320](https://github.com/metatypedev/metatype/pull/320))
</summary>

* doc(tuto): that support for -> supporting in prisma runtime section

* github: update pr-title-workflow

* doc(tuto): add missing highlighted line

</details>
<details >
<summary>
Introduce typegraph_std ([#316](https://github.com/metatypedev/metatype/pull/316))
</summary>

* introduce typegraph_std

* fix typos, update description

* enable simpler import

</details>


### Features

<details >
<summary>
Fine-grained licensing
</summary>



</details>
<details >
<summary>
Change target default for meta dev/deploy ([#314](https://github.com/metatypedev/metatype/pull/314))
</summary>

* feat: meta dev/deploy can choose the targets

* fix: pr title

* fix: pr title

</details>
<details >
<summary>
Fixed tmp dir creation and logging, make tests parallel ([#313](https://github.com/metatypedev/metatype/pull/313))
</summary>

* feat: fixed tmp dir creation and logging

* feat: simplify launch and env

* fix: tests

* feat: parallel tests

* fix: secret cannot override env vars

* fix: license file

* fix: license file

* fix: license header

* fix: tests

* fix: tests

---------

</details>
<details >
<summary>
Ignore files without tg (MET-175) + temporal fixes ([#315](https://github.com/metatypedev/metatype/pull/315))
</summary>

* feat: ignore files without tg (MET-175)

* feat: fix regex

</details>
<details >
<summary>
File upload ([#312](https://github.com/metatypedev/metatype/pull/312))
</summary>

* wip

* Request parser for FormData

* Working file upload

* Implement file download

* Update Cargo.lock

* Add mimeTypes constraint in t.file

* Pass files in `withVars`

* Use aws-sdk from deno

* Fix http runtime

* Configurable path_style

* feat: Multiple file upload

* Add some comments

* Update deno.lock

* Fix pre-commit

* Remove unnecessary comments

* Fix codegen

* feat(workflows/tests): Add minio service

</details>


## [v0.1.8](https://github.com/metatypedev/metatype/releases/tag/v0.1.8) - 2023-05-16

### Bug Fixes

<details >
<summary>
Css on mobile
</summary>



</details>


### Features

<details >
<summary>
Rework landing page and small improvements ([#303](https://github.com/metatypedev/metatype/pull/303))
</summary>



</details>
<details >
<summary>
Update doc, improve design, some renaming and fix cors issue ([#306](https://github.com/metatypedev/metatype/pull/306))
</summary>

* feat: review homepage

* feat: improve doc and fix cors

* fix: links

</details>


### MET-148

<details >
<summary>
Optimized typecheck ([#300](https://github.com/metatypedev/metatype/pull/300))
</summary>

* Performance review

* First draft

* Add tests and fix

* Restore stack size

* Remove performance measurement

* More string format validators

* Fix tests

* Implement regex pattern validation

* Implement enum validation

* Implement enum variants validation

* Fix tests

* Disable enum on optional

* Fix typo

</details>


## [v0.1.7](https://github.com/metatypedev/metatype/releases/tag/v0.1.7) - 2023-05-02

### Features

<details >
<summary>
Rust typegraph sdk poc ([#281](https://github.com/metatypedev/metatype/pull/281))
</summary>

* feat: rust typegraph sdk poc

* fix: ci

* fix: ci

* feat: add black

* feat: small fixes

* feat: test ci

* fix: debug

* fix: debug

* fix: debug

* fix: debug

* fix: debug

</details>
<details >
<summary>
Add prefix to deploy target ([#298](https://github.com/metatypedev/metatype/pull/298))
</summary>

* feat: add prefix to deploy target

* chore: prepare release 0.1.7

* chore: update pre-commit

</details>


## [v0.1.6](https://github.com/metatypedev/metatype/releases/tag/v0.1.6) - 2023-04-27

### MET-163

<details >
<summary>
(prisma) type mismatch on contains for nested relation ([#284](https://github.com/metatypedev/metatype/pull/284))
</summary>

* add test

* extend term for nested

* fix skip nested at root level

* fix test

* update test

* comment groupBy tests

* doc: update generator list

</details>
