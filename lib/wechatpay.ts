import WxPay from 'wechatpay-node-v3';
import crypto from 'crypto';

function getConfig() {
  const mchid = process.env.WXPAY_MCHID || '';
  const appid = process.env.WXPAY_APPID || '';
  const privateKey = (process.env.WXPAY_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const serialNo = process.env.WXPAY_SERIAL_NO || '';
  const apiv3Key = process.env.WXPAY_APIV3_KEY || '';
  const publicKey = (process.env.WXPAY_PUBLIC_KEY || '').replace(/\\n/g, '\n');
  return { mchid, appid, privateKey, serialNo, apiv3Key, publicKey };
}

let _wxpay: InstanceType<typeof WxPay> | null = null;

/** 懒加载 WxPay 实例，避免构建时因缺少环境变量报错 */
export function getWxpay() {
  if (!_wxpay) {
    const { appid, mchid, publicKey, privateKey, serialNo, apiv3Key } = getConfig();
    _wxpay = new WxPay({
      appid,
      mchid,
      publicKey: Buffer.from(publicKey),
      privateKey: Buffer.from(privateKey),
      serial_no: serialNo,
      key: apiv3Key,
    });
  }
  return _wxpay;
}

/** 生成唯一商户订单号 */
export function generateOutTradeNo() {
  return `${Date.now()}${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * 使用微信平台公钥验证回调签名
 * 适用于公钥模式（非平台证书模式）
 */
export function verifyNotifySignature(params: {
  timestamp: string;
  nonce: string;
  body: string;
  signature: string;
}): boolean {
  const { timestamp, nonce, body, signature } = params;
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  const { publicKey } = getConfig();

  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(message);
  return verify.verify(publicKey, signature, 'base64');
}

/**
 * AEAD_AES_256_GCM 解密回调通知中的 resource 数据
 */
export function decryptResource<T = Record<string, unknown>>(
  ciphertext: string,
  associatedData: string,
  nonce: string
): T {
  const { apiv3Key } = getConfig();
  const ciphertextBuffer = Buffer.from(ciphertext, 'base64');
  const authTag = ciphertextBuffer.subarray(ciphertextBuffer.length - 16);
  const data = ciphertextBuffer.subarray(0, ciphertextBuffer.length - 16);

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(apiv3Key),
    Buffer.from(nonce)
  );
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData));

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}
