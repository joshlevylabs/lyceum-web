#!/bin/bash

echo "🔍 Verifying all required files exist for deployment..."
echo ""

files=(
  "src/lib/auth.ts"
  "src/middleware.ts"
  "src/app/api/centcom/auth/session-update/route.ts"
  "src/app/api/admin/sessions/update/route.ts"
  "src/app/api/user/dashboard/stats/route.ts"
  "src/app/api/user/onboarding/sessions/route.ts"
  "src/app/api/centcom/sessions/sync/route.ts"
)

all_exist=true

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ MISSING: $file"
    all_exist=false
  fi
done

echo ""
if [ "$all_exist" = true ]; then
  echo "✅ All required files exist!"
  echo ""
  echo "Ready to deploy. Run:"
  echo "  git add src/"
  echo "  git commit -m 'feat: Add JWT auth to Centcom endpoints'"
  echo "  git push"
else
  echo "❌ Some files are missing. Create them before deploying."
  exit 1
fi
