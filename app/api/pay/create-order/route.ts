import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWxpay, generateOutTradeNo } from '@/lib/wechatpay';

const plans: Record<string, { amount: number; days: number; name: string }> = {
  test:      { amount: 1,     days: 1,   name: '测试支付' },
  monthly:   { amount: 1900,  days: 30,  name: '月付高级版' },
  quarterly: { amount: 4900,  days: 90,  name: '季付高级版' },
  yearly:    { amount: 15900, days: 365, name: '年付高级版' },
};

export async function POST(request: NextRequest) {
  // 1. 获取登录用户
  const userId = request.cookies.get('userId')?.value;
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  // 2. 解析套餐
  const { plan } = await request.json();
  const planInfo = plans[plan as string];
  if (!planInfo) {
    return NextResponse.json({ error: '无效套餐' }, { status: 400 });
  }

  // 3. 生成订单号并保存
  const outTradeNo = generateOutTradeNo();
  const order = await prisma.order.create({
    data: {
      outTradeNo,
      userId,
      plan,
      amount: planInfo.amount,
      status: 'pending',
    },
  });

  // 4. 调用微信 Native 下单
  const notifyUrl = process.env.NOTIFY_URL!;
  try {
    const result = await getWxpay().transactions_native({
      description: planInfo.name,
      out_trade_no: outTradeNo,
      notify_url: notifyUrl,
      amount: { total: planInfo.amount, currency: 'CNY' },
    });

    if (result.status === 200 && result.data?.code_url) {
      return NextResponse.json({
        codeUrl: result.data.code_url,
        outTradeNo,
      });
    }

    throw new Error(result.error || '微信下单返回异常');
  } catch (error) {
    console.error('微信下单失败:', error);
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'failed' },
    });
    return NextResponse.json({ error: '下单失败，请稍后重试' }, { status: 500 });
  }
}
