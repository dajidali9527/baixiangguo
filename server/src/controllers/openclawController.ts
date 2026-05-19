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
  const filePath = path.join(ACCOUNTS_DIR, `${accountId}.json`);
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export async function getWeixinStatus(_req: Request, res: Response) {
  const accountIds = readAccountsIndex();
  const accounts = accountIds.map((id) => {
    const data = readAccountData(id);
    return {
      accountId: id,
      bound: !!data?.token,
      userId: data?.userId || null,
      savedAt: data?.savedAt || null,
    };
  });
  res.json({
    code: 0,
    data: {
      bound: accounts.some((a) => a.bound),
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
  try {
    if (fs.existsSync(ACCOUNTS_INDEX)) {
      fs.writeFileSync(ACCOUNTS_INDEX, '[]', 'utf-8');
    }
  } catch {}
  res.json({
    code: 0,
    data: { unbound: unbound.length, message: `已解绑 ${unbound.length} 个微信账号，重启OpenClaw后生效` },
  });
}
