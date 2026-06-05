#!/bin/sh
# OpenClaw 初始化入口脚本
# 首次启动时直接写入完整 JSON 配置，再用 openclaw doctor --fix 验证修复

CONFIG_DIR="/home/node/.openclaw"
CONFIG_FILE="$CONFIG_DIR/openclaw.json"

# 创建必要目录
mkdir -p "$CONFIG_DIR/workspace"
mkdir -p "$CONFIG_DIR/openclaw-weixin/accounts"
mkdir -p "$CONFIG_DIR/npm/node_modules"

# 安装微信插件（如果尚未安装）— 使用子 shell 避免改变工作目录
WEIXIN_PLUGIN="$CONFIG_DIR/npm/node_modules/@tencent-weixin/openclaw-weixin"
if [ ! -d "$WEIXIN_PLUGIN" ]; then
  echo "[init] 安装微信 ClawBot 插件..."
  (cd "$CONFIG_DIR/npm" && npm init -y 2>/dev/null && npm install @tencent-weixin/openclaw-weixin --registry https://registry.npmmirror.com 2>&1)
  echo "[init] 微信插件安装完成"
else
  echo "[init] 微信插件已安装，跳过"
fi

# matplotlib 已内置到自定义镜像中，无需运行时安装

# 如果配置文件不存在，创建完整配置
if [ ! -f "$CONFIG_FILE" ]; then
  echo "[init] 首次启动，创建 OpenClaw 配置..."

  # 使用固定令牌，方便浏览器记住（调试期间无需每次输入）
  AUTH_TOKEN="baixiangguo2026openclaw"
  echo "[init] OpenClaw 认证令牌: $AUTH_TOKEN (固定令牌，浏览器可记住)"

  # 自动检测本机 IP
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')

  # 构建 allowedOrigins JSON 数组
  ORIGINS='["http://localhost:18789","http://127.0.0.1:18789","http://localhost:3000"'
  if [ -n "$LOCAL_IP" ]; then
    ORIGINS="$ORIGINS,\"http://$LOCAL_IP:18789\",\"http://$LOCAL_IP:3000\""
    echo "[init] 检测到本机 IP: $LOCAL_IP，已添加到 allowedOrigins"
  fi
  ORIGINS="$ORIGINS]"

  # 直接写入完整配置 JSON
  cat > "$CONFIG_FILE" <<ENDOFCONFIG
{
  "gateway": {
    "controlUi": {
      "allowInsecureAuth": true,
      "dangerouslyDisableDeviceAuth": true,
      "allowedOrigins": $ORIGINS
    },
    "auth": {
      "mode": "token",
      "token": "$AUTH_TOKEN"
    },
    "mode": "local",
    "port": 18789,
    "bind": "lan"
  },
  "session": {
    "dmScope": "per-channel-peer"
  },
  "models": {
    "mode": "merge",
    "providers": {
      "bailian": {
        "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "apiKey": "$BAILIAN_API_KEY",
        "api": "openai-completions",
        "models": [
          {
            "id": "glm-5",
            "name": "glm-5",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 202752,
            "maxTokens": 16384,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": { "thinkingFormat": "qwen" }
          },
          {
            "id": "glm-5.1",
            "name": "glm-5.1",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 202752,
            "maxTokens": 16384,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": { "thinkingFormat": "qwen" }
          },
          {
            "id": "qwen-max",
            "name": "qwen-max",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 32768,
            "maxTokens": 8192,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": {}
          },
          {
            "id": "qwen3.7-plus",
            "name": "qwen3.7-plus",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 131072,
            "maxTokens": 8192,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": {}
          },
          {
            "id": "deepseek-v4-pro",
            "name": "deepseek-v4-pro",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 64000,
            "maxTokens": 8192,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": {}
          },
          {
            "id": "deepseek-v4-flash",
            "name": "deepseek-v4-flash",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 64000,
            "maxTokens": 8192,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": {}
          },
          {
            "id": "qwen3.6-plus",
            "name": "qwen3.6-plus",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 131072,
            "maxTokens": 8192,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": {}
          },
          {
            "id": "qwen3.6-flash",
            "name": "qwen3.6-flash",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 131072,
            "maxTokens": 8192,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": {}
          },
          {
            "id": "glm-4.5-air",
            "name": "glm-4.5-air",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 131072,
            "maxTokens": 8192,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": {}
          },
          {
            "id": "MiniMax-M2.5",
            "name": "MiniMax-M2.5",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 131072,
            "maxTokens": 8192,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": {}
          },
          {
            "id": "MiniMax-M2.1",
            "name": "MiniMax-M2.1",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 131072,
            "maxTokens": 8192,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": {}
          },
          {
            "id": "kimi-k2.6",
            "name": "kimi-k2.6",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 131072,
            "maxTokens": 8192,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": {}
          },
          {
            "id": "kimi-k2.5",
            "name": "kimi-k2.5",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 131072,
            "maxTokens": 8192,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": {}
          },
          {
            "id": "qwen3.7-max-preview",
            "name": "qwen3.7-max-preview",
            "reasoning": true,
            "input": ["text"],
            "contextWindow": 131072,
            "maxTokens": 8192,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": {}
          },
          {
            "id": "qwen3.6-max-preview",
            "name": "qwen3.6-max-preview",
            "reasoning": true,
            "input": ["text"],
            "contextWindow": 131072,
            "maxTokens": 8192,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": {}
          },
          {
            "id": "glm-4.7",
            "name": "glm-4.7",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 202752,
            "maxTokens": 16384,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "compat": { "thinkingFormat": "qwen" }
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "bailian/glm-5"
      },
      "systemPromptOverride": "你是百香果报价查询专用机器人。只能使用bash /usr/local/bin/query.sh查询数据，禁止自己写SQL。\n\n【命令】\n- 最新行情: bash /usr/local/bin/query.sh latest [bxx|huinong|xinfadi|jiangnan]\n  不带参数=四个数据源全部\n- N日趋势: bash /usr/local/bin/query.sh trend <天数> [bxx|huinong|xinfadi|jiangnan]\n- 趋势图: bash /usr/local/bin/query.sh plot <天数> <bxx|huinong|xinfadi|jiangnan>\n\n【绝对规则】\n1.禁止自己写SQL或node脚本，只能用query.sh\n2.禁止解释、寒暄、思考过程——直接返回结果\n3.非百香果报价问题回复\"我只能查询百香果报价\"\n4.遇到错误立即停止，报告错误信息\n\n【关键词→参数】\n数据源: 百香果信息平台/公众号→bxx, 惠农网→huinong, 新发地/北京→xinfadi, 江南/广州→jiangnan\n天数: 本周/7日/周报→7, 本月/30日/月报→30, 本季/90日/季报→90, 本年/365日/年报→365\n\n【典型场景】\n- \"江南本周价格\": bash /usr/local/bin/query.sh trend 7 jiangnan && bash /usr/local/bin/query.sh plot 7 jiangnan\n- \"今日价格\": bash /usr/local/bin/query.sh latest\n- \"惠农网本月\": bash /usr/local/bin/query.sh trend 30 huinong && bash /usr/local/bin/query.sh plot 30 huinong\n- \"广州江南报价\": bash /usr/local/bin/query.sh latest jiangnan",
      "heartbeat": {
        "every": "0m"
      }
    }
  },
  "tools": {
    "profile": "coding"
  },
  "skills": {
    "install": {
      "nodeManager": "npm"
    }
  },
  "channels": {
    "openclaw-weixin": {
      "enabled": true,
      "dmPolicy": "open"
    }
  },
  "plugins": {
    "entries": {
      "openclaw-weixin": {
        "enabled": true
      }
    }
  },
  "update": {
    "auto": {
      "enabled": false
    },
    "checkOnStart": false
  }
}
ENDOFCONFIG

  echo "[init] 配置文件已创建"

  # 使用 doctor --fix 验证并修复配置
  echo "[init] 验证配置..."
  openclaw doctor --fix 2>&1 || true
  echo "[init] 配置初始化完成"
else
  echo "[init] 配置文件已存在，跳过初始化"
fi

# 确保 models 配置始终最新（每次启动都更新）
echo "[init] 更新模型配置..."
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));
if (!config.models) config.models = {};
config.models.mode = 'merge';
if (!config.models.providers) config.models.providers = {};
config.models.providers.bailian = {
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: '$BAILIAN_API_KEY',
  api: 'openai-completions',
  models: [
    { id: 'glm-5', name: 'glm-5', reasoning: false, input: ['text'], contextWindow: 202752, maxTokens: 16384, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: { thinkingFormat: 'qwen' } },
    { id: 'glm-5.1', name: 'glm-5.1', reasoning: false, input: ['text'], contextWindow: 202752, maxTokens: 16384, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: { thinkingFormat: 'qwen' } },
    { id: 'qwen-max', name: 'qwen-max', reasoning: false, input: ['text'], contextWindow: 32768, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: {} },
    { id: 'qwen3.7-plus', name: 'qwen3.7-plus', reasoning: false, input: ['text'], contextWindow: 131072, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: {} },
    { id: 'deepseek-v4-pro', name: 'deepseek-v4-pro', reasoning: false, input: ['text'], contextWindow: 64000, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: {} },
    { id: 'deepseek-v4-flash', name: 'deepseek-v4-flash', reasoning: false, input: ['text'], contextWindow: 64000, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: {} },
    { id: 'qwen3.6-plus', name: 'qwen3.6-plus', reasoning: false, input: ['text'], contextWindow: 131072, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: {} },
    { id: 'qwen3.6-flash', name: 'qwen3.6-flash', reasoning: false, input: ['text'], contextWindow: 131072, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: {} },
    { id: 'glm-4.5-air', name: 'glm-4.5-air', reasoning: false, input: ['text'], contextWindow: 131072, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: {} },
    { id: 'MiniMax-M2.5', name: 'MiniMax-M2.5', reasoning: false, input: ['text'], contextWindow: 131072, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: {} },
    { id: 'MiniMax-M2.1', name: 'MiniMax-M2.1', reasoning: false, input: ['text'], contextWindow: 131072, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: {} },
    { id: 'kimi-k2.6', name: 'kimi-k2.6', reasoning: false, input: ['text'], contextWindow: 131072, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: {} },
    { id: 'kimi-k2.5', name: 'kimi-k2.5', reasoning: false, input: ['text'], contextWindow: 131072, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: {} },
    { id: 'qwen3.7-max-preview', name: 'qwen3.7-max-preview', reasoning: true, input: ['text'], contextWindow: 131072, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: {} },
    { id: 'qwen3.6-max-preview', name: 'qwen3.6-max-preview', reasoning: true, input: ['text'], contextWindow: 131072, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: {} },
    { id: 'glm-4.7', name: 'glm-4.7', reasoning: false, input: ['text'], contextWindow: 202752, maxTokens: 16384, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, compat: { thinkingFormat: 'qwen' } }
  ]
};
fs.writeFileSync('$CONFIG_FILE', JSON.stringify(config, null, 2));
console.log('[init] 模型配置已更新，共 ' + config.models.providers.bailian.models.length + ' 个模型');
" 2>&1 || echo "[init] 模型配置更新失败"

# 确保 gateway.controlUi.dangerouslyDisableDeviceAuth 已配置（免设备配对）
echo "[init] 检查设备配对配置..."
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));
// 移除无效的 security 键（如果存在）
if (config.security) { delete config.security; console.log('[init] 已移除无效的 security 配置'); }
if (!config.gateway) config.gateway = {};
if (!config.gateway.controlUi) config.gateway.controlUi = {};
if (!config.gateway.controlUi.dangerouslyDisableDeviceAuth) {
  config.gateway.controlUi.dangerouslyDisableDeviceAuth = true;
  fs.writeFileSync('$CONFIG_FILE', JSON.stringify(config, null, 2));
  console.log('[init] 已开启 dangerouslyDisableDeviceAuth，跳过设备配对');
} else {
  console.log('[init] 设备配对已禁用，跳过');
}
" 2>&1 || echo "[init] 安全配置检查完成"

# 启动 OpenClaw（使用 openclaw CLI 命令，更健壮）
echo "[init] 启动 OpenClaw..."
exec openclaw gateway
