#!/bin/bash

# Initialize environment variables
cat <<EOL > .env
# Add your environment variables below

# Port for the application
PORT=3000
# Database URL
DATABASE_URL='mongodb://localhost:27017/agenthub'
# Other necessary environment variables...
EOL

# Create necessary directory structure
mkdir -p ./src
mkdir -p ./config
mkdir -p ./scripts

# Install npm dependencies
if [ -f package.json ]; then
  npm install
else
  echo "No package.json found!"
fi

# Docker Compose setup
if [ ! -f docker-compose.yml ]; then
  cat <<EOL > docker-compose.yml
version: '3'
services:
  web:
    image: node:latest
    volumes:
      - .:/app
    working_dir: /app
    command: npm start
    ports:
      - \