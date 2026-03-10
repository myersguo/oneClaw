# 飞书(Feishu)集成配置指南

## 第一步：创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 登录您的企业账号
3. 点击"创建应用" → "创建企业自建应用"
4. 填写应用信息：
   - 应用名称：OpenClaw Bot
   - 应用描述：AI助手机器人
   - 权限范围：选择适合的权限

## 第二步：获取应用凭证

在应用详情页找到以下信息：

1. **App ID** - 应用的唯一标识
2. **App Secret** - 应用的密钥
3. **Verification Token** - 事件验证令牌
4. **Encrypt Key** - 消息加密密钥（可选）

## 第三步：配置权限

在"权限管理"中开启以下权限：
- `im:message` - 接收和发送消息
- `im:message.group_at_msg` - 接收@消息
- `im:message.p2p_msg` - 接收单聊消息

## 第四步：配置事件订阅

1. 在"事件订阅"中配置请求地址：
   ```
   http://YOUR_SERVER_IP:3000/feishu/webhook
   ```
   
2. 添加以下事件：
   - 接收消息
   - 机器人进群
   - 机器人被移除

## 第五步：更新配置文件

编辑 `openclaw.json`，替换以下占位符：

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "type": "feishu",
      "config": {
        "app_id": "cli_xxxxxxxx",           // 替换为您的App ID
        "app_secret": "xxxxxxxxxxxxxxxx",   // 替换为您的App Secret
        "verification_token": "xxxxxxxx",   // 替换为Verification Token
        "encrypt_key": "xxxxxxxx",          // 替换为Encrypt Key（如果有）
        "webhook_url": "https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
      },
      "webhook": {
        "path": "/feishu/webhook",
        "port": 3000
      }
    }
  }
}
```

## 第六步：设置环境变量

```bash
export OPENAI_API_KEY="your-openai-api-key"
export FEISHU_APP_ID="your-app-id"
export FEISHU_APP_SECRET="your-app-secret"
```

## 第七步：启动服务

```bash
# 启动网关
openclaw gateway run --port 18789

# 或者在后台启动
nohup openclaw gateway run --port 18789 > gateway.log 2>&1 &
```

## 测试配置

1. 将机器人添加到群聊
2. 在群内@机器人发送消息
3. 检查日志确认消息接收和回复

## 故障排除

- 检查端口3000是否可访问
- 验证飞书事件订阅配置
- 查看网关日志：`tail -f gateway.log`
- 检查环境变量是否正确设置

## 安全建议

- 使用HTTPS（生产环境）
- 配置IP白名单
- 定期轮换App Secret
- 监控API调用频率