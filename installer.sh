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
OUT_DIR="${OUT_DIR:-/usr/local/bin}"
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

if [ "${OUT_DIR}" = "." ]; then
  printf "\n\n%s has been extracted to your current directory\n" "$EXE"
else
  cat <<EOF

$EXE will be moved to $OUT_DIR
Set the OUT_DIR environment variable to change the installation directory:
$ curl -fsSL $INSTALLER_URL | OUT_DIR=. bash

EOF
  if [ -w "${OUT_DIR}" ]; then
    read -p "Press enter to continue (or cancel with Ctrl+C):"
    mv "$EXE" "$OUT_DIR"
  else
    printf "Your password is required to run \"sudo mv %s %s\":\n" "$EXE" "$OUT_DIR"
    sudo mv "$EXE" "$OUT_DIR"
  fi
fi

OUT_DIR=$(realpath $OUT_DIR)
if [[ ":$PATH:" != *":$OUT_DIR:"* ]]; then
  cat <<EOF

The installation directory is not in your PATH, consider adding it:
$ export PATH="\$PATH:$OUT_DIR"
Or moving the executable to another directory in your PATH:
$ sudo mv $EXE /usr/local/bin
EOF
fi
