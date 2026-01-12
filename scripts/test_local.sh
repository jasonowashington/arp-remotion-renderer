#!/usr/bin/env bash
set -euo pipefail
echo "Health:"
curl -s http://localhost:8787/health | jq .
