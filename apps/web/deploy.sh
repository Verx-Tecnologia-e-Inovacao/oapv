#!/bin/bash

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
