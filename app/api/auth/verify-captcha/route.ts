import { NextResponse } from 'next/server'
import Captcha20230305, * as $Captcha20230305 from '@alicloud/captcha20230305';
import  * as $OpenApi from '@alicloud/openapi-client';


export async function POST(req: Request) {
    const { captchaVerifyParam } = await req.json()

    // ====================== 1. 初始化配置 ====================== 
    const config = new $OpenApi.Config({
        accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
        accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
        endpoint: 'captcha.cn-shanghai.aliyuncs.com',
        connectTimeout: 5000,
        readTimeout: 5000
    });

    // ====================== 2. 初始化客户端（实际生产代码中建议复用client） ====================== 
    const client = new Captcha20230305(config);
    // 创建APi请求
    const request = new $Captcha20230305.VerifyIntelligentCaptchaRequest({
        captchaVerifyParam, // 前端传来的验证参数 CaptchaVerifyParam
        sceneId: process.env.ALIYUN_CAPTCHA_SCENE_ID!,
    });

    // ====================== 3. 发起请求） ====================== 
    try {
        const resp = await client.verifyIntelligentCaptcha(request);
        console.log({resp});
        // 建议使用您系统中的日志组件，打印返回
        // 获取验证码验证结果（请注意判空），将结果返回给前端。出现异常建议认为验证通过，优先保证业务可用，然后尽快排查异常原因。
        const captchaVerifyResult = resp.body.result?.verifyResult;
        // 原因code
        const captchaVerifyCode = resp.body.result?.verifyCode;
        console.log('code:', captchaVerifyCode)
        console.log('result:', captchaVerifyResult)

        return NextResponse.json({
            captchaVerifyResult,
            success: true
        })
    } catch (error) {
      // 建议使用您系统中的日志组件，打印异常
      // 出现异常建议认为验证通过，优先保证业务可用，然后尽快排查异常原因。
      console.error('验证码验证失败:', error)
        return NextResponse.json({
        captchaVerifyResult: false,
        success: false,
        message: '验证失败'
        }, { status: 500 })
    }
} 