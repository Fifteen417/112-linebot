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

  if (userMessage.includes('你好') || userMessage.includes('嗨')) {
    replyMessage = '你好！請問您想了解什麼筆記本電腦資訊呢？';
  } else if (userMessage.includes('謝謝') || userMessage.includes('感謝')) {
    replyMessage = '不客氣，很高兴为您服务！';
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyMessage
    });
  } else if (userMessage.includes('推薦') && (userMessage.includes('品牌') || userMessage.includes('價格'))) {
    // 提取品牌和價格資訊
    const brand = extractBrand(userMessage);
    const price = extractPrice(userMessage);

    // 使用 API 進行推薦
    replyMessage = await getRecommendation(brand, price);
  } else {
    // 检查是否与笔记本电脑相关
    if (isLaptopRelated(userMessage)) {
      replyMessage = await getGeminiResponse(userMessage);
    } else {
      replyMessage = '我的回答範圍只有筆記本電腦。';
    }
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyMessage
  });
}

// 提取品牌信息
function extractBrand(message) {
  const brandKeywords = ['品牌', '牌子'];
  for (const keyword of brandKeywords) {
    const startIndex = message.indexOf(keyword) + keyword.length;
    const endIndex = message.indexOf(' ', startIndex);
    if (endIndex > 0) {
      return message.substring(startIndex, endIndex).trim();
    }
  }
  return null;
}

// 提取价格信息
function extractPrice(message) {
  const priceKeywords = ['價格', '价钱'];
  for (const keyword of priceKeywords) {
    const startIndex = message.indexOf(keyword) + keyword.length;
    const endIndex = message.indexOf(' ', startIndex);
    if (endIndex > 0) {
      return message.substring(startIndex, endIndex).trim();
    }
  }
  return null;
}

// 判断是否与笔记本电脑相关
function isLaptopRelated(message) {
  const keywords = ['筆記本', '笔记本', '電腦', '电脑', '性能', '配置', '重量', '螢幕', '屏幕', '尺寸', '容量'];
  return keywords.some(keyword => message.includes(keyword));
}

// 使用 API 进行推荐
async function getRecommendation(brand, price) {
  const url = 'https://your-api-endpoint.com/recommend'; // 替换为您的 API 端点
  try {
    const response = await axios.post(url, {
      brand: brand,
      price: price,
    });
    return response.data.recommendation;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return '抱歉，我无法为您推荐笔记本。';
  }
}

// 使用 Gemini API 获取回答
async function getGeminiResponse(message) {
  const url = 'https://generativelanguage.googleapis.com/v1/models:generateText'; 
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const response = await axios.post(url, {
      prompt: message,
      max_tokens: 100,
      temperature: 0.7,  
      top_k: 40,        
      top_p: 0.9,       
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.text;
  } catch (error) {
    console.error('Error fetching response from Gemini API:', error);
    return '抱歉，我无法处理您的请求。';
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at ${port}`);
});