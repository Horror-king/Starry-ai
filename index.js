const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
app.use(helmet());

// Rate limiting (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// API Configuration
const API_CONFIG = {
  STABILITY_AI: {
    url: 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    headers: {
      'Authorization': 'Bearer sk-2dzDcSBN1GU00n9yggE2EknkzkYNa9eYwn01l7GlIqsfZY5y',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }
};

// GET Endpoint: /generate?prompt=
app.get('/generate', async (req, res) => {
  try {
    const prompt = req.query.prompt;

    if (!prompt) {
      return res.status(400).json({ 
        error: 'Missing prompt parameter',
        usage: '/generate?prompt=YOUR+PROMPT+TEXT'
      });
    }

    console.log(`Generating image for: "${prompt}"`);

    const response = await axios.post(
      API_CONFIG.STABILITY_AI.url,
      {
        text_prompts: [{ text: prompt }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        steps: 30,
        samples: 1
      },
      { 
        headers: API_CONFIG.STABILITY_AI.headers,
        timeout: 30000 
      }
    );
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(response.data.artifacts[0].base64, 'base64');
    
    // Set headers and send PNG directly
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
      'X-Prompt': encodeURIComponent(prompt),
      'X-Generator': 'StabilityAI'
    });
    
    res.end(imageBuffer);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      error: 'Image generation failed',
      details: error.response?.data?.message || error.message
    });
  }
});

// Documentation
app.get('/', (req, res) => {
  res.send(`
    <h1>AI Image Generation API</h1>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Try: http://localhost:${PORT}/generate?prompt=a+beautiful+sunset`);
});