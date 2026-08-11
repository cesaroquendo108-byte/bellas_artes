#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
obsidian_root="${BELLAS_ARTES_OBSIDIAN:-/home/finvecito/Documentos/BellasArtes_Obsidian}"

pattern="(sk-[A-Za-z0-9_-]{20,}|fc-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|GOCSPX-[A-Za-z0-9_-]{20,}|eyJhbGciOiJIUzI1NiIs[A-Za-z0-9._-]{20,}|(?:service[_ -]?role|api[_ -]?key|vercel[_ -]?token|client[_ -]?secret|secret[_ -]?access[_ -]?key|password|contrase(?:n|ñ)a)[[:space:]]*[:=][[:space:]]*[\"']?[A-Za-z0-9_./+=-]{16,})"

mapfile -d '' repo_files < <(
  cd "$repo_root"
  rg --files -0 \
    -g '!node_modules/**' \
    -g '!.next/**' \
    -g '!.git/**' \
    -g '!supabase/.temp/**' \
    -g '!package-lock.json' \
    -g '!.env' \
    -g '!.env.*' \
    -g '!*.png' -g '!*.jpg' -g '!*.jpeg' -g '!*.webp' \
    -g '!*.mp3' -g '!*.wav' -g '!*.mp4' -g '!*.webm' \
    -g '!*.woff' -g '!*.woff2' -g '!*.ttf' -g '!*.ico'
)

mapfile -d '' doc_files < <(
  if [[ -d "$obsidian_root" ]]; then
    find "$obsidian_root" -type f -name '*.md' -print0
  fi
)

hits=()
if ((${#repo_files[@]})); then
  while IFS= read -r file; do hits+=("$repo_root/$file"); done < <(
    cd "$repo_root"
    rg -l --pcre2 "$pattern" -- "${repo_files[@]}" || true
  )
fi
if ((${#doc_files[@]})); then
  while IFS= read -r file; do hits+=("$file"); done < <(
    rg -l --pcre2 "$pattern" -- "${doc_files[@]}" || true
  )
fi

if ((${#hits[@]})); then
  printf 'Se detectaron posibles secretos en:\n' >&2
  printf ' - %s\n' "${hits[@]}" | sort -u >&2
  exit 1
fi

echo "Escaneo de secretos superado."
