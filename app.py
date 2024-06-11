import os
import json
from flask import Flask, request, jsonify
from linebot import (
    LineBotApi, WebhookHandler
)
from linebot.exceptions import (
    InvalidSignatureError
)
from linebot.models import (
    MessageEvent, TextMessage, TextSendMessage,
)
from google.generativeai import GenerativeModel

apiKey = os.environ.get('GEMINI_API_KEY')

# 设置 LINE Channel Access Token 和 Channel Secret
line_bot_api = LineBotApi(os.environ['CHANNEL_ACCESS_TOKEN'])
handler = WebhookHandler(os.environ['CHANNEL_SECRET'])

# 创建 Flask 应用
app = Flask(__name__)

# 处理 LINE Webhook
@app.route("/callback", methods=['POST'])
def callback():
    # 获取请求头中的 Signature
    signature = request.headers['X-Line-Signature']

    # 解析请求主体
    body = request.get_data(as_text=True)
    app.logger.info("Request body: " + body)

    try:
        # 验证签名
        handler.handle(body, signature)
    except InvalidSignatureError:
        print("Invalid signature. Please check your channel access token/channel secret.")
        abort(400)

    return 'OK'

# 处理文字消息事件
@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    # 获取用户发送的文字消息
    user_message = event.message.text.lower()

    # 处理用户输入
    reply_message = process_user_input(user_message)

    # 回复用户
    line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(text=reply_message)
    )

# 处理用户输入
async def process_user_input(user_message):
  reply_message = ''

  # 处理打招呼和结束对话
  if '你好' in user_message or '嗨' in user_message:
    reply_message = '你好！請問您想了解什麼筆記本電腦資訊呢？'
  elif '謝謝' in user_message or '感謝' in user_message:
    reply_message = '不客氣，很高兴为您服务！'
    return reply_message
  elif '結束對話' in user_message or '沒有了' in user_message:
    reply_message = '好的，謝謝您使用筆記本電腦小助手！如果您还有任何关于笔记本电脑的问题，随时都可以问我！'
    return reply_message

  # 使用 Gemini API 生成回复
  if user_message:
    generation_config = {
      "temperature": 1,
      "top_p": 0.95,
      "top_k": 64,
      "max_output_tokens": 8192,
      "response_mime_type": "text/plain",
    }
    model = GenerativeModel(
      model_name="gemini-1.5-flash",
      generation_config=generation_config,
    )

    try:
      response = await model.generate_content([user_message])
      reply_message = response.text
    except Exception as e:
      print(f"Error calling Gemini API: {e}")
      reply_message = "抱歉，我無法處理您的請求。"
  else:
    reply_message = "請問您想問什麼呢？請提供更多資訊，例如：\n\n用途：日常使用、工作、遊戲、學習等等\n特定產品：例如 ASUS ROG Strix G15、ASUS ZenBook 13 UX325 等等\n問題：例如 \"ASUS 的電競品牌是什麼？\"、\"ASUS ZenBook 13 的價格是多少？\" 等等\n\n提供更多資訊，我可以更準確地為您解答。"

  return reply_message

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=port, debug=True)