FROM ghcr.nju.edu.cn/openclaw/openclaw:latest

# 切换到 root 安装系统依赖
USER root

# 配置 apt 国内镜像
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list 2>/dev/null || true \
    && sed -i 's|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list 2>/dev/null || true

# 安装 Python3、pip、matplotlib 和 MySQL 客户端
RUN apt-get update \
    && apt-get install -y python3 python3-pip default-mysql-client \
    && pip3 install matplotlib -i https://pypi.tuna.tsinghua.edu.cn/simple --break-system-packages \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 安装 mysql2（query-db.js 依赖）— 全局 + /opt 双路径确保可找到
RUN npm install -g mysql2 --registry https://registry.npmmirror.com \
    && mkdir -p /opt/node_modules \
    && npm install --prefix /opt mysql2 --registry https://registry.npmmirror.com

# 切换回 node 用户
USER node
