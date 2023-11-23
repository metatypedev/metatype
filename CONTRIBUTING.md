# Contributing to Metatype

First off, thanks for taking the time to contribute! ❤️

All types of contributions are encouraged and valued. Please make sure to read
the relevant section before making your contribution. It will make it a lot
easier for us and smooth out the experience for all involved. The community
looks forward to your contributions. 🎉

> And if you like the project, but just don't have time to contribute, that's
> fine. There are other easy ways to support the project and show your
> appreciation, which we would also be very happy about:
>
> - Star the project
> - Tweet about it
> - Refer this project in your project's readme
> - Mention the project at local meetups and tell your friends/colleagues

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [I Have a Question](#i-have-a-question)
- [I Want To Contribute](#i-want-to-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)
- [Your First Code Contribution](#your-first-code-contribution)

## Code of Conduct

This project and everyone participating in it is governed by our
[Code of Conduct](https://github.com/metatypedev/metatype/blob/main/CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code.

## I Have a Question

> If you want to ask a question, we assume that you have read the available
> [documentation](https://metatype.dev/docs).

Before you ask a question, it is best to search for existing
[Issues](https://github.com/metatypedev/metatype/issues) that might help you. In
case you have found a suitable issue and still need clarification, you can write
your question in this issue. It is also advisable to search the internet for
answers first.

If you then still feel the need to ask a question and need clarification, we
recommend the following:

- Open an [Issue](https://github.com/metatypedev/metatype/issues/new).
- Provide as much context as you can about what you're running into.
- Provide project and platform versions depending on what seems relevant.

## I Want To Contribute

> ### Legal Notice
>
> When contributing to this project, you must agree that you have authored 100%
> of the content, that you have the necessary rights to the content and that the
> content you contribute may be provided under the project license.

### Reporting Bugs

#### Before Submitting a Bug Report

A good bug report shouldn't leave others needing to chase you up for more
information. Therefore, we ask you to investigate carefully, collect information
and describe the issue in detail in your report. Please complete the following
steps in advance to help us fix any potential bug as fast as possible.

- Make sure that you are using the latest version.
- Determine if your bug is really a bug and not an error on your side e.g. using
  incompatible environment components/versions (Make sure that you have read the
  [documentation](https://metatype.dev/docs). If you are looking for support,
  you might want to check [this section](#i-have-a-question)).
- To see if other users have experienced (and potentially already solved) the
  same issue you are having, check if there is not already a bug report existing
  for your bug or error in the [bug tracker](https://github.com/metatypedev/metatype/issues?q=label%3Abug).
- Also make sure to search the internet (including Stack Overflow) to see if
  users outside the GitHub community have discussed the issue.
- Collect information about the bug:
- Stack trace
- OS, Platform and Version (Windows, Linux, macOS, x86, ARM)
- Version of the interpreter, compiler, SDK, runtime environment, package
  manager, depending on what seems relevant.
- Possibly your input and the output
- Can you reliably reproduce the issue? And can you also reproduce it with older
  versions?

#### How Do I Submit a Good Bug Report?

> You must never report security related issues, vulnerabilities or bugs
> including sensitive information to the issue tracker, or elsewhere in public.
> Instead sensitive bugs must be reported according to the
> [Security Policy](https://github.com/metatypedev/metatype/blob/main/SECURITY.md).

We use GitHub issues to track bugs and errors. If you run into an issue with the
project:

- Open an [Issue](https://github.com/metatypedev/metatype/issues/new). (Since we
  can't be sure at this point whether it is a bug or not, we ask you not to talk
  about a bug yet and not to label the issue.)
- Explain the behavior you would expect and the actual behavior.
- Please provide as much context as possible and describe the _reproduction
  steps_ that someone else can follow to recreate the issue on their own. This
  usually includes your code. For good bug reports you should isolate the
  problem and create a reduced test case.
- Provide the information you collected in the previous section.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for
Metatype, **including completely new features and minor improvements to existing
functionality**. Following these guidelines will help us and the community to
understand your suggestion and find related suggestions.

#### Before Submitting an Enhancement

- Make sure that you are using the latest version.
- Read the [documentation](https://metatype.dev/docs) carefully and find out if
  the functionality is already covered, maybe by an individual configuration.
- Perform a [search](https://github.com/metatypedev/metatype/issues) to see if
  the enhancement has already been suggested. If it has, add a comment to the
  existing issue instead of opening a new one.
- Find out whether your idea fits with the scope and aims of the project. It's
  up to you to make a strong case to convince the project's developers of the
  merits of this feature. Keep in mind that we want features that will be useful
  to the majority of our users and not just a small subset. If you're just
  targeting a minority of users, consider writing an add-on/plugin library.

#### How Do I Submit a Good Enhancement Suggestion?

Enhancement suggestions are tracked as
[GitHub issues](https://github.com/metatypedev/metatype/issues).

- Use a **clear and descriptive title** for the issue to identify the
  suggestion.
- Provide a **step-by-step description of the suggested enhancement** in as many
  details as possible.
- **Describe the current behavior** and **explain which behavior you expected to
  see instead** and why. At this point you can also tell which alternatives do
  not work for you.
- **Explain why this enhancement would be useful** to most Metatype users. You
  may also want to point out the other projects that solved it better and which
  could serve as inspiration.

### Your First Code Contribution

Metatype is using a mono-repository approach. This means that all code is
centralized and requires many different tools to work with. The following
sections will guide you through the setup process.

#### Dependencies

Install the following global dependencies:

- [Rust](https://www.rust-lang.org/tools/install)
- [Python](https://www.python.org/downloads/)
- [Pipx](https://pypa.github.io/pipx/installation/)
- [PNPM](https://pnpm.io/installation)
- [Deno](https://deno.com/manual/getting_started/installation)
- [Node](https://nodejs.org/en/download/)

And then more specific ones for the workspace:

```bash
# manage rust dependencies
cargo install cargo-edit
# task runner
cargo install whiz
# enforce style and good practice
pipx install pre-commit
# manange python dependencies
pipx install poetry
# wasmedge prerequisits
brew install llvm
sudo apt-get install libclang-dev 
# grpc prerequisits
brew install protobuf
sudo apt-get install protobuf-compiler libprotobuf-dev
# wasmedge runtime
curl -sSf https://raw.githubusercontent.com/WasmEdge/WasmEdge/master/utils/install.sh | bash
```

#### Running The Project

```bash
# install git commit hooks
pre-commit install
# prepare python virtual environment
python3 -m venv .venv
source .venv/bin/activate # depends on your shell
# run the task runner and it will install the remaining dependencies (see whiz.yaml and install step)
whiz
```

#### Environments And Tests

```bash
deno run -A dev/env.ts all # or only the envs required (e.g. base prisma s3)
cargo test --tests # there is a bug with wasm and doc testings
deno run -A dev/test.ts # all tests
deno run -A dev/test.ts runtimes/prisma/full_prisma_mapping_test.ts # isolated test
deno run -A dev/env.ts # shutdown all envs
```

There are many more developer scripts in the `dev` folder, however most of them
should only be needed for advanced tasks.

#### Commit Messages

Pre-commit hooks enforce some basic checks, namely that all commit messages
follow the [conventional commit](https://www.conventionalcommits.org/en/v1.0.0/)
format. This is a simple set of rules that makes review easier and help us to
generate a changelog.

#### Faster linking

We recommend using [mold](https://github.com/rui314/mold) for Linux targets and
macOS new parallel linker for faster linking. You can use them as aliases or
configure them in your `~/.cargo/config.toml` file.

```toml
[target.aarch64-apple-darwin]
rustflags = [
    "-C", "link-arg=-fuse-ld=/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/ld",
    "-C", "link-arg=-ld_new" # makes sure the new parallel linker is used
]

[target.x86_64-unknown-linux-gnu]
rustflags = [
    "-C", "link-arg=-fuse-ld=mold"
]
```
