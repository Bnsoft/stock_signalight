#!/bin/bash
# Usage: ./push.sh "your commit message"

if [ -z "$1" ]; then
  echo "Usage: ./push.sh \"your commit message\""
  exit 1
fi

cd "$(dirname "$0")"

git add .
git commit -m "$1"
git push origin main
