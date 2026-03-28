import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "用户协议",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">用户协议</h1>
        <p className="text-sm text-muted-foreground mb-8">
          更新日期：2026 年 3 月 25 日 &nbsp;|&nbsp; 生效日期：2026 年 3 月 25 日
        </p>

        <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">一、总则</h2>
            <p>
              欢迎使用 Listenly（以下简称「本平台」）。本协议是您与本平台之间关于使用本平台服务所订立的协议。请您在注册或使用本平台服务前，仔细阅读本协议的全部内容。一旦您注册、登录或以其他方式使用本平台服务，即视为您已阅读、理解并同意接受本协议的约束。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">二、账号注册与管理</h2>
            <p>1. 您可通过微信扫码、邮箱验证码等方式注册并登录本平台。</p>
            <p>2. 您应提供真实、准确的注册信息，并妥善保管账号及密码。因您个人原因导致账号被盗用或信息泄露，本平台不承担责任。</p>
            <p>3. 每位用户仅可注册一个账号。如发现恶意注册多个账号，本平台有权予以封禁处理。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">三、服务内容</h2>
            <p>本平台为用户提供英语学习相关服务，包括但不限于：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>单词拼写练习</li>
              <li>句子听写训练</li>
              <li>影子跟读练习</li>
              <li>视听演练</li>
              <li>词汇量测评</li>
            </ul>
            <p>本平台有权根据运营需要，随时调整、更新或终止部分或全部服务内容，并会在合理范围内提前通知用户。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">四、会员服务</h2>
            <p>1. 本平台提供免费服务和付费会员服务。付费会员可享受更多学习内容和功能。</p>
            <p>2. 会员服务的具体内容、价格和有效期以购买时页面展示为准。</p>
            <p>3. 会员服务一经购买，非因本平台原因不予退款。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">五、用户行为规范</h2>
            <p>您在使用本平台服务时，不得有以下行为：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>利用技术手段恶意攻击、干扰本平台正常运行</li>
              <li>未经授权抓取、复制本平台内容</li>
              <li>利用本平台从事任何违法违规活动</li>
              <li>发布任何违法、侵权、虚假或不当内容</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">六、知识产权</h2>
            <p>本平台的所有内容（包括但不限于文字、音频、图片、软件、界面设计等）的知识产权归本平台所有或经合法授权使用。未经本平台书面许可，任何人不得擅自使用。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">七、免责声明</h2>
            <p>1. 本平台提供的学习内容仅供参考，不保证完全准确无误。</p>
            <p>2. 因不可抗力、系统维护等原因导致服务中断，本平台不承担责任，但会尽快恢复服务。</p>
            <p>3. 本平台不对用户因使用本平台服务而产生的学习效果作任何承诺或保证。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">八、协议修改</h2>
            <p>本平台有权根据需要修改本协议内容，修改后的协议将在本页面公布。如您继续使用本平台服务，即视为您同意修改后的协议。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-3">九、联系方式</h2>
            <p>如您对本协议有任何疑问，请通过平台内的反馈功能与我们联系。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
