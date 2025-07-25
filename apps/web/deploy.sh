#!/bin/bash

<<<<<<< HEAD
set -e  # Para interromper em caso de erro
APP_NAME="via-open-agent-platform"
APP_DIR="/home/ubuntu/app/apps/web"

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
=======
# Caminho da aplicação
APP_DIR="/home/ubuntu/oapv/apps/web"
PROCESS_NAME="nextjs-oapv"
BRANCH="main"

echo "---- [Deploy Next.js via PM2] ----"
echo "Entrando na pasta do projeto..."
cd "$APP_DIR" || { echo "Falha ao acessar $APP_DIR"; exit 1; }

echo "Atualizando o repositório..."
git pull origin $BRANCH

echo "Instalando dependências (yarn)..."
yarn install

echo "Buildando aplicação..."
yarn build:internal

echo "Verificando processo PM2 ($PROCESS_NAME)..."
if pm2 list | grep -q "$PROCESS_NAME"; then
  echo "Reiniciando processo PM2 ($PROCESS_NAME)..."
  pm2 restart "$PROCESS_NAME"
else
  echo "Criando novo processo PM2 ($PROCESS_NAME)..."
  pm2 start npm --name "$PROCESS_NAME" -- start
fi

echo "Deploy concluído!"
>>>>>>> 70a4be7048c628af16bb2729eee1a9cfaae1d77b
