import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const WEIXIN_STATE_DIR = process.env.OPENCLAW_STATE_DIR || '/openclaw_data/openclaw-weixin';
const ACCOUNTS_INDEX = path.join(WEIXIN_STATE_DIR, 'accounts.json');
const ACCOUNTS_DIR = path.join(WEIXIN_STATE_DIR, 'accounts');

function readAccountsIndex(): string[] {
  try {
    if (!fs.existsSync(ACCOUNTS_INDEX)) return [];
    const raw = fs.readFileSync(ACCOUNTS_INDEX, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id: any) => typeof id === 'string' && id.trim()) : [];
  } catch {
    return [];
  }
}

function readAccountData(accountId: string): any | null {
  // 尝试读取主文件
  const filePath = path.join(ACCOUNTS_DIR, `${accountId}.json`);
  // 也检查 sync 文件
  const syncFilePath = path.join(ACCOUNTS_DIR, `${accountId}.sync.json`);
  
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else if (fs.existsSync(syncFilePath)) {
      // 有sync文件说明已经连接
      return { hasSync: true };
    }
    return null;
  } catch {
    // 即使读不出内容，只要有文件就认为已绑定
    if (fs.existsSync(filePath) || fs.existsSync(syncFilePath)) {
      return { hasFile: true };
    }
    return null;
  }
}

export async function getWeixinStatus(_req: Request, res: Response) {
  const accountIds = readAccountsIndex();
  const accounts = accountIds.map((id) => {
    const data = readAccountData(id);
    const hasSyncFile = fs.existsSync(path.join(ACCOUNTS_DIR, `${id}.sync.json`));
    return {
      accountId: id,
      bound: !!data || hasSyncFile,
      userId: data?.userId || null,
      savedAt: data?.savedAt || null,
    };
  });
  
  // 如果 accounts.json 是空的，但有 sync 文件，说明也已绑定
  let hasBound = accounts.some((a) => a.bound);
  if (!hasBound) {
    // 直接检查是否有任何 account 相关文件
    try {
      if (fs.existsSync(ACCOUNTS_DIR)) {
        const files = fs.readdirSync(ACCOUNTS_DIR);
        hasBound = files.some(f => f.endsWith('.sync.json') || f.endsWith('.json'));
        
        // 如果找到文件但没在 accounts 列表里，补充进去
        if (hasBound && accounts.length === 0) {
          const syncFiles = files.filter(f => f.endsWith('.sync.json'));
          if (syncFiles.length > 0) {
            const accountId = syncFiles[0].replace('.sync.json', '');
            accounts.push({
              accountId,
              bound: true,
              userId: null,
              savedAt: null,
            });
          }
        }
      }
    } catch {}
  }
  
  res.json({
    code: 0,
    data: {
      bound: hasBound,
      accounts,
      loginCommand: 'docker exec -it passion-fruit-openclaw openclaw channels login --channel openclaw-weixin',
    },
  });
}

export async function loginWeixin(_req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sendEvent = (type: string, data: string) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent('message', '正在启动登录流程...');
    
    const dockerProcess = spawn('docker', [
      'exec',
      'passion-fruit-openclaw',
      'openclaw',
      'channels',
      'login',
      '--channel',
      'openclaw-weixin'
    ]);

    let outputBuffer = '';
    
    dockerProcess.stdout.on('data', (data) => {
      const output = data.toString('utf-8');
      outputBuffer += output;
      sendEvent('output', output);
    });

    dockerProcess.stderr.on('data', (data) => {
      const output = data.toString('utf-8');
      outputBuffer += output;
      sendEvent('output', output);
    });

    dockerProcess.on('close', (code) => {
      if (code === 0) {
        sendEvent('success', '登录流程完成！');
      } else {
        sendEvent('error', `登录流程退出，代码: ${code}`);
      }
      sendEvent('done', code?.toString() || 'unknown');
      res.end();
    });

    dockerProcess.on('error', (err) => {
      sendEvent('error', `执行错误: ${err.message}`);
      sendEvent('done', 'error');
      res.end();
    });

    // 超时处理（60秒）
    const timeout = setTimeout(() => {
      dockerProcess.kill();
      sendEvent('error', '登录超时，请重试');
      sendEvent('done', 'timeout');
      res.end();
    }, 60000);

    res.on('close', () => {
      clearTimeout(timeout);
      dockerProcess.kill();
    });
  } catch (error: any) {
    sendEvent('error', `错误: ${error.message}`);
    sendEvent('done', 'error');
    res.end();
  }
}

export async function unbindWeixin(_req: Request, res: Response) {
  const accountIds = readAccountsIndex();
  const unbound: string[] = [];
  for (const id of accountIds) {
    const accountFile = path.join(ACCOUNTS_DIR, `${id}.json`);
    const syncFile = path.join(ACCOUNTS_DIR, `${id}.sync.json`);
    const ctxFile = path.join(ACCOUNTS_DIR, `${id}.context-tokens.json`);
    [accountFile, syncFile, ctxFile].forEach((f) => {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
    });
    unbound.push(id);
  }
  // 即使 accounts.json 是空的，也检查并删除目录下的所有文件
  try {
    if (fs.existsSync(ACCOUNTS_DIR)) {
      const files = fs.readdirSync(ACCOUNTS_DIR);
      files.forEach(file => {
        const filePath = path.join(ACCOUNTS_DIR, file);
        try { fs.unlinkSync(filePath); } catch {}
      });
    }
  } catch {}
  try {
    if (fs.existsSync(ACCOUNTS_INDEX)) {
      fs.writeFileSync(ACCOUNTS_INDEX, '[]', 'utf-8');
    }
  } catch {}
  res.json({
    code: 0,
    data: { unbound: unbound.length, message: `已解绑微信账号，重启OpenClaw后生效` },
  });
}
