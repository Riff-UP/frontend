#!/usr/bin/env bash
# pull-all-branches.sh
# Script para hacer pull de todas las ramas remotas de origin y traer sus cambios a ramas locales.
# Comportamiento:
#  - Hace `git fetch --all --prune`.
#  - Para cada rama remota en `origin/*` (excepto HEAD):
#      - Si existe una rama local con el mismo nombre, hace `git checkout <branch>` y `git pull --ff-only origin <branch>`.
#      - Si no existe, crea una rama local tracking con `git checkout -b <branch> origin/<branch>`.
#  - Registra operaciones en `pull-log.txt` y fallos en `pull-failures.txt`.
#  - No hace push.
# Uso: desde la raíz del repo: ./pull-all-branches.sh
# Opcional: pasar nombres de ramas como argumentos para limitar qué ramas se actualizan.

set -euo pipefail
IFS=$'\n\t'

REMOTE="origin"
FAIL_FILE="pull-failures.txt"
LOG_FILE="pull-log.txt"

# Guardar rama actual para volver al final
CURRENT_BRANCH="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || echo "")"

# Lista opcional de ramas a procesar pasada por argumentos
if [ "$#" -gt 0 ]; then
  echo "Modo limitado: sólo se procesarán las ramas pasadas como argumentos." | tee -a "$LOG_FILE"
  mapfile -t branches < <(printf "%s\n" "$@")
else
  # Obtener todas las ramas remotas de origin (sin el prefijo origin/)
  mapfile -t branches < <(git for-each-ref --format='%(refname:short)' refs/remotes/$REMOTE | sed "s#^$REMOTE/##" | grep -v '^HEAD$' || true)
fi

if [ ${#branches[@]} -eq 0 ]; then
  echo "No se encontraron ramas para procesar." | tee -a "$LOG_FILE"
  exit 0
fi

echo "Fetch de todos los remotos..." | tee -a "$LOG_FILE"
git fetch --all --prune 2>&1 | tee -a "$LOG_FILE"

: > "$FAIL_FILE"
: > "$LOG_FILE"  # reiniciar el log (se sobreescribe por claridad)

echo "Ramas a procesar:" | tee -a "$LOG_FILE"
for b in "${branches[@]}"; do echo " - $b" | tee -a "$LOG_FILE"; done

echo "Iniciando pulls..." | tee -a "$LOG_FILE"

for br in "${branches[@]}"; do
  echo
  echo "--- Procesando: $br ---" | tee -a "$LOG_FILE"
  # Verificar que la rama remota exista
  if ! git ls-remote --exit-code --heads "$REMOTE" "$br" >/dev/null 2>&1; then
    echo "Aviso: origin/$br no existe. Se omite." | tee -a "$LOG_FILE"
    echo "origin/$br" >> "$FAIL_FILE"
    continue
  fi

  if git show-ref --verify --quiet "refs/heads/$br"; then
    # Rama local existe
    if git checkout "$br" >/dev/null 2>&1; then
      echo "Checked out local $br" | tee -a "$LOG_FILE"
      # Intentar pull con fast-forward only para evitar merges automáticos
      if git pull --ff-only "$REMOTE" "$br" 2>&1 | tee -a "$LOG_FILE"; then
        echo "Pull exitoso en $br" | tee -a "$LOG_FILE"
      else
        echo "Error al hacer pull --ff-only en $br (posible conflicto/divergencia)." | tee -a "$LOG_FILE"
        echo "$br" >> "$FAIL_FILE"
      fi
    else
      echo "No fue posible hacer checkout a $br" | tee -a "$LOG_FILE"
      echo "$br" >> "$FAIL_FILE"
    fi
  else
    # Rama local no existe; crear desde origin/branch
    if git checkout -b "$br" "$REMOTE/$br" 2>&1 | tee -a "$LOG_FILE"; then
      echo "Creada rama local $br desde $REMOTE/$br" | tee -a "$LOG_FILE"
    else
      echo "Error creando rama local $br desde $REMOTE/$br" | tee -a "$LOG_FILE"
      echo "$br" >> "$FAIL_FILE"
    fi
  fi
done

# Volver a la rama original si existe
if [ -n "$CURRENT_BRANCH" ]; then
  git checkout "$CURRENT_BRANCH" >/dev/null 2>&1 || true
fi

if [ -s "$FAIL_FILE" ]; then
  echo "Algunas ramas tuvieron errores. Revisa $FAIL_FILE y $LOG_FILE" | tee -a "$LOG_FILE"
  echo "Ramas con fallos:" | tee -a "$LOG_FILE"
  cat "$FAIL_FILE" | tee -a "$LOG_FILE"
  exit 2
else
  echo "Pull de todas las ramas finalizado correctamente. Revisa $LOG_FILE para más detalles." | tee -a "$LOG_FILE"
  exit 0
fi

