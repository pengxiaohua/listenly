const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // 为旧内核浏览器（如 2345 浏览器使用的 Chromium 109）生成兼容回退：
    // oklch()/oklab() 需要 Chrome 111+，color-mix() 需要 Chrome 111+。
    // preserve:true 让新浏览器仍使用 oklch/color-mix，旧浏览器使用 rgb 回退。
    "@csstools/postcss-oklab-function": { preserve: true },
    "@csstools/postcss-color-mix-function": { preserve: true },
    // 必须放在最后：为定义在 CSS 变量（如 --background: oklch(...)）中的现代颜色
    // 生成 @supports 包裹的回退，因为非法的自定义属性值不会像普通声明那样被丢弃。
    "@csstools/postcss-progressive-custom-properties": {},
  },
};

export default config;
