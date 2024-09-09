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
TMP_DIR=$(mktemp -d)
OUT_DIR="${OUT_DIR:-$HOME/.metatype/bin}"
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

if [ -n "${META_THIN+x}" ]; then
  printf "Detected \$META_THIN\n"
  ASSET="$NAME-thin-v$VERSION-$PLATFORM"
else
  ASSET="$NAME-v$VERSION-$PLATFORM"
fi
DOWNLOAD_URL="$RELEASE_URL/download/v$VERSION/$ASSET.$EXT"
echo $DOWNLOAD_URL

if curl --fail --silent --location --output "$TMP_DIR/$ASSET.$EXT" "$DOWNLOAD_URL"; then
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

tar -C "$TMP_DIR" -xzf "$TMP_DIR/$ASSET.$EXT" "$EXE"
chmod +x "$TMP_DIR/$EXE"

if [ "${OUT_DIR}" = "." ]; then
  mv "$TMP_DIR/$EXE" .
  printf "\n\n%s has been extracted to your current directory\n" "$EXE"
else
  cat <<EOF

$EXE will be moved to $OUT_DIR
Set the OUT_DIR environment variable to change the installation directory:
$ curl -fsSL $INSTALLER_URL | OUT_DIR=. bash

EOF
  if [ ! -d "${OUT_DIR}" ]; then
    mkdir -p "$OUT_DIR"
  fi

  if [ -w "${OUT_DIR}" ]; then
    read -p "Press enter to continue (or cancel with Ctrl+C):"
    mv "$TMP_DIR/$EXE" "$OUT_DIR"
  else
    echo "$OUT_DIR is not writable."
    exit 1
  fi
fi

rm -r "$TMP_DIR"

SHELL_TYPE=$(basename "$SHELL")

case $SHELL_TYPE in
  bash)
    SHELL_CONFIG="$HOME/.bashrc"
    ;;
  zsh)
    SHELL_CONFIG="$HOME/.zshrc"
    ;;
  fish)
    SHELL_CONFIG="$HOME/.config/fish/config.fish"
    ;;
  ksh)
    SHELL_CONFIG="$HOME/.kshrc"
    ;;
  *)
    SHELL_CONFIG=""
esac

if [ -n $SHELL_CONFIG ]; then
  echo "Detected shell: $SHELL_TYPE"
  read -p "Do you want to append the new PATH to your configuration ($SHELL_CONFIG)? (y/n): " answer

  answer=$(echo "$answer" | tr '[:upper:]' '[:lower:]')

  case $SHELL_TYPE in
    bash|zsh|ksh)
      APPEND_CMD="export PATH=\"$OUT_DIR:\$PATH\""
      ;;
    fish)
      APPEND_CMD="set -gx PATH $OUT_DIR \$PATH"
      ;;
  esac

  if [ "$answer" = "y" ] || [ "$answer" = "yes" ]; then

    echo "$APPEND_CMD" >> "$SHELL_CONFIG"
    printf "Path added to %s\nRun 'source %s' to apply changes." "$SHELL_CONFIG" "$SHELL_CONFIG"
  else
    cat <<EOF

Consider adding $OUT_DIR to your PATH if it is not already configured.
$ $APPEND_CMD
EOF
  fi
else
  OUT_DIR=$(realpath $OUT_DIR)
  if [[ ":$PATH:" != *":$OUT_DIR:"* ]]; then
    cat <<EOF

The installation directory is not in your PATH, consider adding it:
$ export PATH="\$PATH:$OUT_DIR"
EOF
  fi
fi
