import { registerPlugin } from '@capacitor/core';

interface NativeSmbPlugin {
  putObject(options: {
    host: string;
    share: string;
    username: string;
    password: string;
    domain: string;
    key: string;
    /** base64 编码的文件内容 */
    body: string;
  }): Promise<{ ok: boolean }>;

  getObject(options: {
    host: string;
    share: string;
    username: string;
    password: string;
    domain: string;
    key: string;
  }): Promise<{
    status: number;
    /** base64 编码的文件内容 */
    body: string;
  }>;

  headObject(options: {
    host: string;
    share: string;
    username: string;
    password: string;
    domain: string;
    key: string;
  }): Promise<{
    status: number;
    contentLength?: number;
    lastModified?: number;
  }>;

  testConnection(options: {
    host: string;
    share: string;
    username: string;
    password: string;
    domain: string;
  }): Promise<{
    ok: boolean;
    message?: string;
  }>;
}

export const NativeSmb = registerPlugin<NativeSmbPlugin>('Smb');
