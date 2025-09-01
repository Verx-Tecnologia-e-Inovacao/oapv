#!/bin/bash

set -e  # Para interromper em caso de erro
APP_NAME="via-open-agent-platform"
APP_DIR="/home/ubuntu/oapv/apps/web"

echo "🚀 Iniciando deploy para $APP_NAME..."

# 1. Acessa o diretório da aplicação
cd $APP_DIR

echo "✅ Diretório atual: $(pwd)"

# 2. Ativa Corepack e garante Yarn 3.5.1
echo "🔍 Ativando Corepack e Yarn 3.5.1..."
corepack enable
corepack prepare yarn@3.5.1 --activate

echo "✅ Yarn versão: $(yarn --version)"

# 3. Remove caches antigos
echo "🗑 Removendo cache local..."
rm -rf .turbo .next

# 4. Instala dependências
echo "📦 Instalando dependências..."
yarn install --immutable

# 5. Executa build limpa
echo "⚙️  Executando build limpa com Turbo..."
yarn build --force || yarn build:internal

# 6. Confere se .next existe
if [ ! -d ".next" ]; then
  echo "❌ Erro: pasta .next não encontrada após o build!"
  exit 1
fi
echo "✅ Build concluído com sucesso!"

# 7. Reinicia aplicação no PM2
echo "🔄 Reiniciando aplicação no PM2..."
pm2 delete $APP_NAME || true
pm2 start yarn --name $APP_NAME -- start
pm2 save

# 8. Testa se a aplicação está rodando
echo "⏳ Aguardando aplicação iniciar..."
sleep 5

if curl -s --head http://127.0.0.1:3000 | grep "200 OK" > /dev/null; then
  echo "✅ Aplicação está online em http://127.0.0.1:3000"
else
  echo "⚠️ Aviso: A aplicação não respondeu com 200 OK. Verifique logs com: pm2 logs $APP_NAME"
fi

echo "🚀 Deploy finalizado com sucesso!"

