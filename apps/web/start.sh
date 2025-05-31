yarn build

pm2 delete via-open-agent-platform

pm2 start "yarn start" --name via-open-agent-platform
