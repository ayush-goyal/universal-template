FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

########################################################
# SYSTEM DEPENDENCIES
########################################################

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ca-certificates \
    gnupg \
    sudo \
    openssh-server \
    && rm -rf /var/lib/apt/lists/*

########################################################
# NODE.JS 22 + PNPM
########################################################

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.6.3 --activate

########################################################
# POSTGRESQL 16
########################################################

RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Allow local connections without password
RUN echo "local all all trust" > /etc/postgresql/16/main/pg_hba.conf \
    && echo "host all all 127.0.0.1/32 trust" >> /etc/postgresql/16/main/pg_hba.conf \
    && echo "host all all ::1/128 trust" >> /etc/postgresql/16/main/pg_hba.conf

########################################################
# DOCKER INSTALLATION (for complex Docker setups)
########################################################

RUN install -m 0755 -d /etc/apt/keyrings && \
    curl --retry 3 --retry-delay 5 -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y \
    docker-ce=5:28.5.2-1~ubuntu.24.04~noble \
    docker-ce-cli=5:28.5.2-1~ubuntu.24.04~noble \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y fuse-overlayfs && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /etc/docker && \
    printf '%s\n' '{' \
    '  "storage-driver": "fuse-overlayfs"' \
    '}' > /etc/docker/daemon.json
RUN apt-get update && apt-get install -y iptables && rm -rf /var/lib/apt/lists/*
RUN update-alternatives --set iptables /usr/sbin/iptables-legacy && \
    update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy

########################################################
# CONFIG UBUNTU USER
########################################################

RUN echo 'PasswordAuthentication no\nChallengeResponseAuthentication no\nUsePAM no' > /etc/ssh/sshd_config.d/disable_password_auth.conf

# Create non-root user (only if it doesn't exist)
RUN id -u ubuntu &>/dev/null || useradd -m -s /bin/bash ubuntu
# Create docker group if it doesn't exist and add ubuntu user to it
RUN groupadd -f docker && usermod -aG docker ubuntu
RUN usermod -aG sudo ubuntu
# Configure passwordless sudo for ubuntu user
RUN echo "ubuntu ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ubuntu
# Set a password for ubuntu user
RUN echo "ubuntu:ubuntu" | chpasswd

WORKDIR /workspace
