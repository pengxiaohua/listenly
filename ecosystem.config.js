module.exports = {
  apps: [{
    name: 'listenly',
    script: 'pnpm',
    args: 'start',
    cwd: process.cwd(),  // 自动使用当前项目目录
    instances: 1, // 先用单实例调试
    exec_mode: 'fork', // 使用 fork 模式调试
    // 加载环境变量文件
    env_file: './.env.production',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '1G',
    error_file: './logs/err.log',    // 错误日志路径
    out_file: './logs/out.log',      // 输出日志路径
    log_file: './logs/combined.log', // 组合日志路径
    time: true,
    // 添加一些调试选项
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    min_uptime: '10s',
    max_restarts: 5,
    restart_delay: 2000
  }]
}
