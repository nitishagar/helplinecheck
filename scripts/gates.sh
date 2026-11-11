#!/usr/bin/env bash
# HelplineCheck gates: schema-gate, unit-gate, judge-gate, e2e-gate.
# Usage: ./scripts/gates.sh [schema-gate|unit-gate|judge-gate|e2e-gate|all]
set -euo pipefail
cd "$(dirname "$0")/.."

gate="$1"

schema_gate() {
  echo "== schema-gate: strict contracts + generator =="
  npx vitest run tests/schema-contract.test.ts tests/taxonomy-generator.test.ts
}

unit_gate() {
  echo "== unit-gate: full offline suite =="
  npx vitest run
}

judge_gate() {
  echo "== judge-gate: fixture oracles + fallback matrix =="
  npx vitest run tests/flawed-bot.test.ts tests/fallback-matrix.test.ts
}

e2e_gate() {
  echo "== e2e-gate: local audit with before/after scores =="
  ./scripts/e2e-phase1.sh
}

case "$gate" in
  schema-gate) schema_gate ;;
  unit-gate) unit_gate ;;
  judge-gate) judge_gate ;;
  e2e-gate) e2e_gate ;;
  all) schema_gate; judge_gate; unit_gate; e2e_gate; echo "GATES OK: all four gates passed" ;;
  *) echo "unknown gate: $gate (want schema-gate|unit-gate|judge-gate|e2e-gate|all)" >&2; exit 2 ;;
esac
