#!/usr/bin/env bash
set -Eeuo pipefail

readonly APP_ROOT="/var/www/coldpower"
readonly SHARED_DIR="${APP_ROOT}/shared"
readonly RELEASES_DIR="${APP_ROOT}/releases"
readonly CURRENT_LINK="${APP_ROOT}/current"
readonly ENV_FILE="${SHARED_DIR}/.env.production"
readonly REPO_URL="${COLDPOWER_REPO_URL:-https://github.com/JeanFSC/COLDPOWER.git}"
readonly TAG="${1:?Uso: ./ops/deploy-production.sh <tag> }"
readonly RELEASE_ID="${TAG//\//-}-$(date -u +%Y%m%d%H%M%S)"
readonly RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"

if [[ ! -f "${ENV_FILE}" ]]; then
  printf 'Falta el archivo de producción: %s\n' "${ENV_FILE}" >&2
  exit 1
fi

if ! git check-ref-format "refs/tags/${TAG}" >/dev/null 2>&1; then
  printf 'El tag no tiene un formato válido: %s\n' "${TAG}" >&2
  exit 1
fi

mkdir -p "${RELEASES_DIR}"
git clone --depth 1 --branch "${TAG}" "${REPO_URL}" "${RELEASE_DIR}"
ln -s "${ENV_FILE}" "${RELEASE_DIR}/.env.production"

cd "${RELEASE_DIR}"
corepack enable
corepack prepare pnpm@11.20.0 --activate
pnpm install --frozen-lockfile
pnpm lint
pnpm test:all
pnpm build

set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a
pnpm exec drizzle-kit migrate

previous_release=""
if [[ -L "${CURRENT_LINK}" ]]; then
  previous_release="$(readlink -f "${CURRENT_LINK}")"
fi

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

if ! pm2 startOrReload "${CURRENT_LINK}/ecosystem.config.cjs" --env production --update-env; then
  if [[ -n "${previous_release}" ]]; then
    ln -sfn "${previous_release}" "${CURRENT_LINK}"
    pm2 startOrReload "${CURRENT_LINK}/ecosystem.config.cjs" --env production --update-env || true
  fi
  exit 1
fi

healthy=false
for attempt in {1..30}; do
  if curl --fail --silent --show-error http://127.0.0.1:3000/api/health >/dev/null; then
    healthy=true
    break
  fi
  sleep 1
done

if [[ "${healthy}" != true ]]; then
  printf 'La release no respondió en /api/health\n' >&2
  if [[ -n "${previous_release}" ]]; then
    ln -sfn "${previous_release}" "${CURRENT_LINK}"
    pm2 startOrReload "${CURRENT_LINK}/ecosystem.config.cjs" --env production --update-env || true
  fi
  exit 1
fi

pm2 save
printf 'Despliegue exitoso: %s\n' "${TAG}"
