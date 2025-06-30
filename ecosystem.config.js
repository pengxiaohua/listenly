/**
 * PM2 配置文件 (ecosystem.config.js)
 *
 * 使用场景：
 * 1. 首次部署：pm2 start ecosystem.config.js
 * 2. 配置更改：pm2 reload ecosystem.config.js
 * 3. 服务器重启后：pm2 start ecosystem.config.js
 * 4. PM2 进程意外停止：pm2 start ecosystem.config.js
 *
 * 设置自动启动：
 * 1. pm2 startup  # 生成开机自启动脚本
 * 2. pm2 start ecosystem.config.js  # 启动应用
 * 3. pm2 save  # 保存当前进程列表
 *
 * 日常重启：
 * - 优雅重启：pm2 reload listenly
 * - 普通重启：pm2 restart listenly
 *
 * 查看日志：
 * - 实时日志：pm2 logs listenly
 * - 历史日志：查看 ./logs 目录下的文件
 */

// 这是阿里云的PM2配置文件，用于部署到阿里云服务器上
// 执行命令：pm2 start ecosystem.config.js
module.exports = {
  apps: [{
    // 应用名称
    name: 'listenly',
    // 使用 pnpm 包管理器
    script: 'pnpm',
    // 执行 start 命令
    args: 'start',
    // 工作目录
    cwd: '/var/www/listenly',
    // 实例数量（fork 模式下应该为 1）
    instances: 1,
    // 执行模式，fork 适用于 Next.js
    exec_mode: 'fork',
    // 环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // 内存超限重启
    max_memory_restart: '1G',
    // 日志文件配置
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    // 日志增加时间戳
    time: true,
    // 禁用文件监视
    watch: false,
    // 最短运行时间，用于判断是否异常重启
    min_uptime: '10s',
    // 异常重启次数限制
    max_restarts: 5,
    // 重启延迟
    restart_delay: 2000
  }]
}
