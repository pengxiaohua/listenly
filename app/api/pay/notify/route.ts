import { NextRequest, NextResponse } from 'next/server';
import { verifyNotifySignature, decryptResource } from '@/lib/wechatpay';

// 动态导入 prisma 避免 TS server 缓存旧类型
async function getDb() {
  const { prisma } = await import('@/lib/prisma');
  return prisma;
}

const planDays: Record<string, number> = {
  trial: 3,
  test: 1,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export async function POST(request: NextRequest) {
  try {
    // 1. 获取原始请求体及 headers
    const rawBody = await request.text();
    const timestamp = request.headers.get('wechatpay-timestamp') || '';
    const nonce = request.headers.get('wechatpay-nonce') || '';
    const signature = request.headers.get('wechatpay-signature') || '';

    // 2. 使用公钥验证签名
    const verified = verifyNotifySignature({
      timestamp,
      nonce,
      body: rawBody,
      signature,
    });

    if (!verified) {
      console.error('回调签名验证失败');
      return NextResponse.json(
        { code: 'FAIL', message: '签名失败' },
        { status: 401 }
      );
    }

    // 3. 解密 resource 数据
    const body = JSON.parse(rawBody);
    const { ciphertext, nonce: resourceNonce, associated_data } = body.resource;
    const result = decryptResource<{
      out_trade_no: string;
      transaction_id: string;
      trade_state: string;
    }>(ciphertext, associated_data, resourceNonce);

    // 只处理支付成功的通知
    if (result.trade_state !== 'SUCCESS') {
      return NextResponse.json({ code: 'SUCCESS', message: '成功' });
    }

    const { out_trade_no: outTradeNo, transaction_id: transactionId } = result;
    const db = await getDb();

    // 4. 事务处理：更新订单 + 用户会员信息
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).$transaction(async (tx: any) => {
      const order = await tx.order.findUnique({
        where: { outTradeNo },
        include: { user: true },
      });

      if (!order) throw new Error('订单不存在');
      if (order.status === 'paid') return; // 幂等处理

      // 更新订单状态
      await tx.order.update({
        where: { outTradeNo },
        data: { status: 'paid', transactionId },
      });

      // 基于所有已支付订单重新计算会员到期时间
      // 这样无论回调顺序、重复触发，结果都是确定性的
      const allPaidOrders = await tx.order.findMany({
        where: { userId: order.userId, status: 'paid' },
        orderBy: { createdAt: 'asc' },
        select: { plan: true, createdAt: true },
      });

      let cursor = 0;
      for (const o of allPaidOrders) {
        const days = planDays[o.plan] ?? 30;
        const oTime = new Date(o.createdAt).getTime();
        const start = cursor > oTime ? cursor : oTime;
        cursor = start + days * 24 * 60 * 60 * 1000;
      }

      await tx.user.update({
        where: { id: order.userId },
        data: {
          membershipExpiresAt: new Date(cursor),
        },
      });
    });

    return NextResponse.json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    console.error('回调处理失败:', error);
    return NextResponse.json(
      { code: 'FAIL', message: '处理失败' },
      { status: 500 }
    );
  }
}
