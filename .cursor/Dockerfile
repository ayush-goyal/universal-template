FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

########################################################
# SYSTEM DEPENDENCIES + POSTGRESQL 16
########################################################
# Single apt layer so the package index is downloaded once.
# postgresql on bookworm ships PostgreSQL 15; we explicitly use the upstream
# PGDG repo to pin PostgreSQL 16 to match production/Supabase compatibility.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        gnupg \
        sudo \
        openssh-server \
        lsb-release; \
    install -m 0755 -d /etc/apt/keyrings; \
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
        | gpg --dearmor -o /etc/apt/keyrings/postgresql.gpg; \
    echo "deb [signed-by=/etc/apt/keyrings/postgresql.gpg] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        postgresql-16 \
        postgresql-client-16; \
    rm -rf /var/lib/apt/lists/*

# Allow local connections without password (dev convenience for the agent).
RUN echo "local all all trust"           >  /etc/postgresql/16/main/pg_hba.conf \
 && echo "host all all 127.0.0.1/32 trust" >> /etc/postgresql/16/main/pg_hba.conf \
 && echo "host all all ::1/128 trust"      >> /etc/postgresql/16/main/pg_hba.conf

########################################################
# PNPM
########################################################
# Node and corepack ship with the base image, so we only need to pin pnpm.
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate

########################################################
# CONFIG UBUNTU USER
########################################################

RUN echo 'PasswordAuthentication no\nChallengeResponseAuthentication no\nUsePAM no' \
        > /etc/ssh/sshd_config.d/disable_password_auth.conf

RUN set -eux; \
    id -u ubuntu >/dev/null 2>&1 || useradd -m -s /bin/bash ubuntu; \
    usermod -aG sudo ubuntu; \
    echo "ubuntu ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ubuntu; \
    echo "ubuntu:ubuntu" | chpasswd

WORKDIR /workspace
