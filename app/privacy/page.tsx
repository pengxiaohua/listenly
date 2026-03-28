import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">隐私政策</h1>
        <p className="text-sm text-muted-foreground mb-8">
          更新日期：2026 年 3 月 25 日 &nbsp;|&nbsp; 生效日期：2026 年 3 月 25 日
        </p>

        <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">一、引言</h2>
            <p>
              Listenly（以下简称「我们」）非常重视用户的隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。请您在使用我们的服务前，仔细阅读本政策。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">二、我们收集的信息</h2>
            <p>为向您提供服务，我们可能收集以下信息：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>账号信息：邮箱地址、微信昵称和头像（通过微信登录时）</li>
              <li>设备信息：操作系统类型、浏览器类型（用户改善用户体验）</li>
              <li>学习数据：练习记录、学习进度、测评结果等</li>
              <li>反馈信息：您主动提交的反馈内容和截图</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">三、信息使用目的</h2>
            <p>我们收集的信息将用于：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>提供、维护和改进我们的服务</li>
              <li>验证您的身份，保障账号安全</li>
              <li>个性化您的学习体验</li>
              <li>分析服务使用情况，优化产品功能</li>
              <li>向您发送服务相关通知（如验证码）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">四、信息存储与保护</h2>
            <p>1. 您的个人信息存储在中国境内的服务器上。</p>
            <p>2. 我们采用行业通行的安全技术和管理措施来保护您的个人信息，防止未经授权的访问、使用或泄露。</p>
            <p>3. 我们会在实现服务目的所必需的最短时间内保留您的个人信息。当您注销账号后，我们将在合理期限内删除您的个人信息。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">五、信息共享</h2>
            <p>我们不会将您的个人信息出售给任何第三方。在以下情况下，我们可能会共享您的信息：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>经您明确同意后</li>
              <li>为完成支付等必要服务，与支付服务商共享必要的订单信息</li>
              <li>根据法律法规要求或政府主管部门的强制性要求</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">六、Cookie 的使用</h2>
            <p>我们使用 Cookie 来维持您的登录状态。这些 Cookie 是服务正常运行所必需的。您可以通过浏览器设置管理 Cookie，但禁用 Cookie 可能影响您正常使用本平台。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">七、您的权利</h2>
            <p>您对自己的个人信息享有以下权利：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>查看和修改您的个人资料</li>
              <li>删除您的账号及相关数据</li>
              <li>撤回您的授权同意</li>
            </ul>
            <p>您可以通过平台内的个人中心或反馈功能行使上述权利。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">八、未成年人保护</h2>
            <p>我们非常重视对未成年人个人信息的保护。如果您是未满 14 周岁的未成年人，请在监护人的陪同和同意下使用我们的服务。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">九、政策更新</h2>
            <p>我们可能会不时更新本隐私政策。更新后的政策将在本页面公布，重大变更时我们会通过平台通知您。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">十、联系我们</h2>
            <p>如您对本隐私政策有任何疑问或建议，请通过平台内的反馈功能与我们联系。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
