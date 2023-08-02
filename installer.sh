#!/bin/sh

set -e -u

ORG=metatypedev
REPO=metatype
EXT=tar.gz
NAME=meta-cli
EXE=meta

INSTALLER_URL="https://raw.githubusercontent.com/$ORG/$REPO/main/installer.sh"
RELEASE_URL="https://github.com/$ORG/$REPO/releases"

LATEST_VERSION=$(curl "$RELEASE_URL/latest" -s -L -I -o /dev/null -w '%{url_effective}')
LATEST_VERSION="${LATEST_VERSION##*v}"

PLATFORM="${PLATFORM:-}"
VERSION="${VERSION:-$LATEST_VERSION}"
MACHINE=$(uname -m)

if [ "${PLATFORM:-x}" = "x" ]; then
  case "$(uname -s | tr '[:upper:]' '[:lower:]')" in
    "linux")
      case "$MACHINE" in
        "arm64"* | "aarch64"* ) PLATFORM='aarch64-unknown-linux-gnu' ;;
        *"64") PLATFORM='x86_64-unknown-linux-gnu' ;;
      esac
      ;;
    "darwin")
      case "$MACHINE" in
        "arm64"* | "aarch64"* ) PLATFORM='aarch64-apple-darwin' ;;
        *"64") PLATFORM='x86_64-apple-darwin' ;;
      esac
      ;;
    "msys"*|"cygwin"*|"mingw"*|*"_nt"*|"win"*)
      case "$MACHINE" in
        *"64") PLATFORM='x86_64-pc-windows-msvc' ;;
      esac
      ;;
  esac
  if [ "${PLATFORM:-x}" = "x" ]; then
    cat >&2 <<EOF

/!\\ We couldn't automatically detect your operating system. /!\\

To continue with installation, please choose from one of the following values:
- aarch64-unknown-linux-gnu
- x86_64-unknown-linux-gnu
- x86_64-unknown-linux-musl
- aarch64-apple-darwin
- x86_64-apple-darwin
- x86_64-pc-windows-msvc

Then set the PLATFORM environment variable, and re-run this script:
$ curl -fsSL $INSTALLER_URL | PLATFORM=x86_64-unknown-linux-musl bash
EOF
    exit 1
  fi
  printf "Detected platform: %s\n" "$PLATFORM"
fi

printf "Detected version: %s\n" "$VERSION"
ASSET="$NAME-v$VERSION-$PLATFORM"
DOWNLOAD_URL="$RELEASE_URL/download/v$VERSION/$ASSET.$EXT"

if curl --fail --silent --location --output "$ASSET.$EXT" "$DOWNLOAD_URL"; then
  printf "Downloaded successfully: %s\n" "$ASSET.$EXT"
else
  cat >&2 <<EOF

/!\\ The asset $ASSET.$EXT doesn't exist. /!\\

To continue with installation, please make sure the release exists in:
$RELEASE_URL

Then set the PLATFORM and VERSION environment variables, and re-run this script:
$ curl -fsSL $INSTALLER_URL | PLATFORM=x86_64-unknown-linux-musl VERSION=0.1.10 bash
EOF
  exit 1
fi

tar -xzf "$ASSET.$EXT" "$EXE"
rm "$ASSET.$EXT"
chmod +x "$EXE"

cat <<EOF

$NAME has been extracted to your folder, please move it to /usr/local/bin (or any other folder on your PATH):
$ sudo mv $EXE /usr/local/bin
$ $EXE
EOF
