#!/usr/bin/env bash
set -euo pipefail

ROOT="/root/bot-teste"
EMAIL="admin@portoplan.com.br"
NAME="Admin"

read -r -s -p "Nova senha para admin@portoplan.com.br: " PASSWORD
echo

cd "$ROOT/backend"
HASH=$(node -e 'const bcrypt=require("bcryptjs"); console.log(bcrypt.hashSync(process.argv[1],8));' "$PASSWORD")

sudo -u postgres psql -d bot_db -v ON_ERROR_STOP=1   --set=admin_email="$EMAIL"   --set=admin_hash="$HASH"   --set=admin_name="$NAME"   -c 'INSERT INTO "Users" (name,email,profile,"passwordHash","companyId","createdAt","updatedAt",super,status)
      VALUES (:'"'"'admin_name'"'"', :'"'"'admin_email'"'"', '"'"'admin'"'"', :'"'"'admin_hash'"'"', 1, NOW(), NOW(), true, true)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        profile = '"'"'admin'"'"',
        "passwordHash" = EXCLUDED."passwordHash",
        "companyId" = 1,
        "updatedAt" = NOW(),
        super = true,
        status = true;'

echo "ADMIN_OK"
echo "Usuario: $EMAIL"
