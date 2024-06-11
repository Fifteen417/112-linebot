require('dotenv').config();
const express = require('express');
const { LineBotApi, WebhookHandler } = require('@line/bot-sdk');
const { GenerativeModel } = require('google-generativeai');

// 设置环境变量
const apiKey = process.env.GEMINI_API_KEY;

// 设置 LINE Channel Access Token 和 Channel Secret
const lineBotApi = new LineBotApi(process.env.CHANNEL_ACCESS_TOKEN);
const handler = new WebhookHandler(process.env.CHANNEL_SECRET);

// 创建 Express 应用
const app = express();

// 处理 LINE Webhook
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
});

// 处理事件
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text.toLowerCase();

  let replyMessage = '';

  // 处理打招呼
  if (userMessage.includes('你好') || userMessage.includes('嗨')) {
    replyMessage = '你好！請問您想了解什麼筆記本電腦資訊呢？';
  } 
  // 处理结束对话
  else if (userMessage.includes('謝謝') || userMessage.includes('感謝')) {
    replyMessage = '不客氣，很高兴为您服务！';
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyMessage
    });
  } 
  // 处理其他请求
  else {
    replyMessage = await getGeminiResponse(userMessage);
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyMessage
  });
}

// 使用 Gemini API 获取回答
async function getGeminiResponse(message) {
  const generationConfig = {
    temperature: 1,
    top_p: 0.95,
    top_k: 64,
    max_output_tokens: 8192,
    response_mime_type: 'text/plain',
  };
  const model = new GenerativeModel({
    model_name: 'gemini-1.5-flash',
    generation_config: generationConfig,
  });
  
  try {
    const response = await model.generateContent([message]);
    return response.text;
  } catch (error) {
    console.error('Error fetching response from Gemini API:', error);
    return '抱歉，我无法处理您的请求。';
  }
}


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at ${port}`);
});