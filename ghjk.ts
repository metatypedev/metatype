export { ghjk } from "https://raw.github.com/metatypedev/ghjk/423d38e/mod.ts";
import * as ghjk from "https://raw.github.com/metatypedev/ghjk/423d38e/mod.ts";
import * as ports from "https://raw.github.com/metatypedev/ghjk/423d38e/ports/mod.ts";

const PROTOC_VERSION = "v24.1";
const POETRY_VERSION = "1.7.0";
const PYTHON_VERSION = "3.8.18";
const PNPM_VERSION = "v8.15.2";
const WASM_TOOLS_VERSION = "1.0.53";
const JCO_VERSION = "1.0.0";
const WASMEDGE_VERSION = "0.13.5";
const WASM_OPT_VERSION = "0.116.0";
const MOLD_VERSION = "v2.4.0";
const CMAKE_VERSION = "3.28.0-rc6";
const CARGO_INSTA_VERSION = "1.33.0";
const NODE_VERSION = "20.8.0";
const WASI_PYTHON_VERSION = "3.11.1";
const LIBPYTHON_VERSION = `libpython-${WASI_PYTHON_VERSION}`;
const WASI_SDK_VERSION = "wasi-sdk-19";
const WASI_VFS_VERSION = "v0.4.0";
const RUST_NIGHTLY_VERSION = "nightly-2024-03-07";

const inCi = () => !!Deno.env.get("CI");
const inOci = () => !!Deno.env.get("OCI");
const inDev = () => !inCi() && !inOci();

ghjk.install(
  ports.wasmedge({ version: WASMEDGE_VERSION }),
  ports.protoc({ version: PROTOC_VERSION }),
  ports.asdf({
    pluginRepo: "https://github.com/asdf-community/asdf-cmake",
    installType: "version",
    version: CMAKE_VERSION,
  }),
  ports.cargo_binstall(),
);

// these aren't required by the typegate build process
if (!inOci()) {
  ghjk.install(
    ports.cargobi({ crateName: "wasm-opt", version: WASM_OPT_VERSION }),
    ports.cargobi({ crateName: "wasm-tools", version: WASM_TOOLS_VERSION }),
    ports.cargobi({ crateName: "cargo-insta", version: CARGO_INSTA_VERSION }),
    ports.node({ version: NODE_VERSION }),
    ports.pnpm({ version: PNPM_VERSION }),
    // FIXME: jco installs node as a dep
    ports.npmi({
      packageName: "@bytecodealliance/jco",
      version: JCO_VERSION,
    })[0],
    ports.npmi({ packageName: "node-gyp", version: "10.0.1" })[0],
  );
}

if (Deno.build.os == "linux" && !Deno.env.has("NO_MOLD")) {
  ghjk.install(
    ports.mold({
      version: MOLD_VERSION,
      replaceLd: Deno.env.has("CI") || Deno.env.has("OCI"),
    }),
  );
}

if (!Deno.env.has("NO_PYTHON")) {
  ghjk.install(
    ports.cpy_bs({ version: PYTHON_VERSION }),
    ports.pipi({
      packageName: "poetry",
      version: POETRY_VERSION,
    })[0],
  );
  if (!Deno.env.has("CI") && !Deno.env.has("OCI")) {
    ghjk.install(
      ports.pipi({ packageName: "pre-commit" })[0],
    );
  }
}

if (inDev()) {
  ghjk.install(
    ports.act({}),
    ports.cargobi({ crateName: "whiz" }),
  );
}

const allowedPortDeps = [...ghjk.stdDeps({ enableRuntimes: true })];

export const secureConfig = ghjk.secureConfig({
  allowedPortDeps,
});

const installs = {
  rust: ports.rust({ targets: ["wasm32-wasi"], version: RUST_NIGHTLY_VERSION }),
};

ghjk.task("install-pywasi-rx", {
  allowedPortDeps,
  installs: [
    ports.tar(),
    ports.unzip(),
  ],
  async fn({ $ }) {
    const WASI_VFS_DL =
      `https://github.com/kateinoigakukun/wasi-vfs/releases/download/${WASI_VFS_VERSION}/libwasi_vfs-wasm32-unknown-unknown.zip`;
    const LIBPYTHON_DL =
      `https://github.com/assambar/webassembly-language-runtimes/releases/download/python%2F3.11.1%2B20230223-8a6223c/${LIBPYTHON_VERSION}.tar.gz`;
    let WASI_SDK_DL;
    let WASI_VFS_CLI_DL;
    switch (Deno.build.os) {
      case "linux":
        WASI_SDK_DL =
          `https://github.com/WebAssembly/wasi-sdk/releases/download/${WASI_SDK_VERSION}/${WASI_SDK_VERSION}.0-linux.tar.gz`;
        WASI_VFS_CLI_DL =
          `https://github.com/kateinoigakukun/wasi-vfs/releases/download/${WASI_VFS_VERSION}/wasi-vfs-cli-x86_64-unknown-linux-gnu.zip`;
        break;
      case "darwin":
        WASI_SDK_DL =
          `https://github.com/WebAssembly/wasi-sdk/releases/download/${WASI_SDK_VERSION}/${WASI_SDK_VERSION}.0-macos.tar.gz`;
        WASI_VFS_CLI_DL =
          `https://github.com/kateinoigakukun/wasi-vfs/releases/download/${WASI_VFS_VERSION}/wasi-vfs-cli-aarch64-apple-darwin.zip`;
        break;
      default:
        throw new Error("unsupported platform", { cause: Deno.build });
    }

    const vendor = $.path(import.meta.dirname!).join(
      "libs",
      "python-wasi-reactor",
      "vendor",
    );
    if (await vendor.exists()) {
      await vendor.remove({ recursive: true });
    }

    const [libpyDir, libvfsDir] = await Promise.all([
      vendor.join("libpython")
        .ensureDir(),
      vendor.join("wasi-vfs", "lib")
        .ensureDir(),
    ]);

    const [libPyBallPath, libZipPath, cliZipPath, sdkBallPath] = await Promise
      .all([
        $.request(LIBPYTHON_DL)
          .showProgress(true)
          .pipeToPath(vendor.join(`${LIBPYTHON_VERSION}.tar.gz`)),
        $.request(WASI_VFS_DL)
          .showProgress(true)
          .pipeToPath(vendor.join(`wasi-vfs-${LIBPYTHON_VERSION}.zip`)),
        $.request(WASI_VFS_CLI_DL)
          .showProgress(true)
          .pipeToPath(vendor.join(
            `wasi-vfs-cli-${LIBPYTHON_VERSION}.zip`,
          )),
        $.request(WASI_SDK_DL)
          .showProgress()
          .pipeToPath(vendor.join(`${WASI_SDK_VERSION}.tar.gz`)),
      ]);
    await Promise.all([
      $`tar -xf ${libPyBallPath} -C ${libpyDir}`,
      $`unzip ${libZipPath} -d ${libvfsDir}`,
      $`unzip ${cliZipPath} -d ${libvfsDir.parent()}`,
      $`tar -xf ${sdkBallPath} -C ${vendor}`,
    ]);
    await vendor.join(`${WASI_SDK_VERSION}.0`)
      .rename(vendor.join(`wasi-sdk`));
  },
});

// TODO(ghjk): set working directory for entire task
// TODO(ghjk): default working directory to dirname of ghjkfile
ghjk.task("build-pywasi-rx", {
  allowedPortDeps,
  installs: [
    ports.tar(),
    installs.rust,
    ports.cargobi({ crateName: "wasm-opt", version: WASM_OPT_VERSION }),
  ],
  async fn({ $, argv }) {
    const wd = $.path(import.meta.dirname!).join("libs", "python-wasi-reactor");
    const buildD = await wd.join("target/pywasi-rx");
    if (await buildD.exists()) {
      await buildD.remove({ recursive: true });
    }
    await buildD.ensureDir();

    await $`cargo build --target wasm32-wasi --features "wasm" -p python-wasi-reactor --release`
      .cwd(wd);
    const modulePath = buildD.join("python-wasi-reactor.wasm");
    await wd.join("target/wasm32-wasi/release/python-wasi-reactor.wasm")
      .copyFile(modulePath);
    if (argv[0] == "--release") {
      const out = `python${WASI_PYTHON_VERSION}-wasi-reactor.wasm`;
      const outPath = buildD.join(out);
      await modulePath.rename(outPath);
      await $`wasm-opt -Oz ${outPath} -o ${outPath}`;
      await $`tar cvzf ${outPath}.tar.gz -C ${buildD} ${out}`;
    }
  },
});

ghjk.task("test-pywasi-rx", {
  allowedPortDeps,
  installs: [installs.rust],
  async fn({ $ }) {
    const wd = $.path(import.meta.dirname!).join("libs", "python-wasi-reactor");
    // cargo build --target x86_64-unknown-linux-gnu -p python-wasi-reactor --release
    await $`cargo test --target x86_64-unknown-linux-gnu -p python-wasi-reactor`
      .cwd(wd);
  },
});

ghjk.task("clean", {
  async fn({ $ }) {
    await Promise.all([
      $`cargo clean`,
      $`cargo clean`.cwd(
        $.path(import.meta.dirname!).join("libs", "python-wasi-reactor"),
      ),
    ]);
  },
});
