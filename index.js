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

  const triggerKeywords = ['推薦', '詳細資訊', '比較'];
  const shouldUseGemini = triggerKeywords.some(keyword => userMessage.includes(keyword));

  if (shouldUseGemini) {
    replyMessage = await getGeminiResponse(userMessage);
  } else {
    switch (true) {
      case userMessage.includes('你好'):
        replyMessage = '歡迎使用筆記本電腦推薦助手！請問您需要什麼樣的幫助呢？';
        break;
      case userMessage.includes('筆記本'):
        replyMessage = '好的，請告訴我您的具體需求，比如性能、價格範圍、品牌偏好等。';
        break;
      case userMessage.includes('輕薄'):
        replyMessage = '明白了，我會為您推薦符合這些要求的筆記本。';
        break;
      case userMessage.includes('決定購買'):
        replyMessage = '不客氣，祝您購物愉快！如果您還有其他問題或需要幫助，隨時聯繫我。';
        break;
      case userMessage.includes('評分'):
        replyMessage = '非常感謝！如果您願意的話，您可以給我一個評分，以幫助我們改進服務。評分範圍是1到5，1表示非常不滿意，5表示非常滿意。您願意給我評分嗎？';
        break;
      default:
        replyMessage = '对不起，我不明白您的意思。請再說一遍。';
    }
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyMessage
  });
}

async function getGeminiResponse(message) {
  const url = 'https://generativelanguage.googleapis.com/v1/models:generateText';  // 正確的 Gemini API URL
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const response = await axios.post(url, {
      prompt: message,
      max_tokens: 100,
      temperature: 0.7,  // 可選參數，控制回應的創造性
      top_k: 40,        // 可選參數，控制回應的選擇範圍
      top_p: 0.9,       // 可選參數，控制回應的可能性分佈
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.text;
  } catch (error) {
    console.error('Error fetching response from Gemini API:', error);
    return '抱歉，我無法處理您的請求。';
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at ${port}`);
});