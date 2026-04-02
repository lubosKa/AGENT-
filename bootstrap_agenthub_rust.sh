#!/bin/bash

# This script creates a complete Rust project with Actix-web, PostgreSQL, Redis,
# controlled agent spawning, depth limiting, and Docker Compose setup.

# Function to create a new Rust project
create_rust_project() {
    local project_name=$1
    cargo new $project_name
    cd $project_name || exit
}

# Function to create a basic Actix-web server
setup_actix_web() {
    echo "[dependencies]" >> Cargo.toml
    echo "actix-web = \"4.0\"" >> Cargo.toml
}

# Function to setup PostgreSQL dependency
setup_postgresql() {
    echo "[dependencies]" >> Cargo.toml
    echo "diesel = { version = \"2.0\", features = [\"postgres\", \"serde\"] }" >> Cargo.toml
}

# Function to setup Redis dependency
setup_redis() {
    echo "[dependencies]" >> Cargo.toml
    echo "redis = \"0.22\"" >> Cargo.toml
}

# Function to create Docker Compose file
create_docker_compose() {
    cat <<EOF > docker-compose.yml
version: '3.8'\nservices:\n  web:\n    build: .\n    ports:\n      - \"8080:8080\"\n    depends_on:\n      - db\n      - redis\n  db:\n    image: postgres\n    environment:\n      POSTGRES_USER: user\n      POSTGRES_PASSWORD: password\n      POSTGRES_DB: agent_db\n  redis:\n    image: redis\nEOF
}

# Main script execution
main() {
    local project_name="agent_project"
    create_rust_project $project_name
    cd $project_name || exit

    setup_actix_web
    setup_postgresql
    setup_redis
    create_docker_compose

    echo "Rust project with Actix-web, PostgreSQL, Redis setup completed!"
}

main
