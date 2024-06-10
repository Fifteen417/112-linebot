require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);
const app = express();

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text.toLowerCase();

  let replyMessage = '';

  const triggerKeywords = ['推荐', '详细信息', '比较'];
  const shouldUseGemini = triggerKeywords.some(keyword => userMessage.includes(keyword));


  if (shouldUseGemini) {
    replyMessage = await getGeminiResponse(userMessage);
  } else {
    switch (true) {
      case userMessage.includes('你好'):
        replyMessage = '欢迎使用筆記本電腦推荐助手！请问您需要什么样的帮助呢？';
        break;
      case userMessage.includes('筆記本'):
        replyMessage = '好的，请告诉我您的具体需求，比如性能、价格范围、品牌偏好等。';
        break;
      case userMessage.includes('轻薄'):
        replyMessage = '明白了，我会为您推荐符合这些要求的笔记本。';
        break;
      case userMessage.includes('决定购买'):
        replyMessage = '不客气，祝您购物愉快！如果您还有其他问题或需要帮助，随时联系我。';
        break;
      case userMessage.includes('评分'):
        replyMessage = '非常感谢！如果您愿意的话，您可以给我一个评分，以帮助我们改进服务。评分范围是1到5，1表示非常不满意，5表示非常满意。您愿意给我评分吗？';
        break;
      default:
        replyMessage = '对不起，我不明白您的意思。请再说一遍。';
    }
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyMessage
  });
}

async function getGeminiResponse(message) {
  const url = 'https://generativelanguage.googleapis.com/$discovery/rest?version=v1';  // 替换为实际的Gemini API URL
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const response = await axios.post(url, {
      prompt: message,
      max_tokens: 100,
      apiKey: apiKey,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].text  // 根据实际的API响应格式调整
  } catch (error) {
    console.error('Error fetching response from Gemini API:', error);
    return '抱歉，我无法处理您的请求。';
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at ${port}`);
});