const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Your StarryAI API Key
const API_KEY = 'NYo6Sx1lutC92_o98m6NET7RNDdQZw';

// Middleware
app.use(bodyParser.json());

// /generate endpoint
app.get('/generate', async (req, res) => {
    const prompt = req.query.prompt;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt query parameter is required.' });
    }

    console.log(`[DEBUG] Received prompt: ${prompt}`);

    try {
        // Step 1: Create generation request
        const creationResponse = await axios.post(
            'https://api.starryai.com/creations/',
            {
                model: "lyra",
                aspectRatio: "square",
                highResolution: false,
                images: 4,
                steps: 20,
                initialImageMode: "color",
                prompt: prompt
            },
            {
                headers: {
                    'X-API-Key': API_KEY,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        const creationId = creationResponse.data.id;
        console.log(`[DEBUG] Creation ID: ${creationId}`);

        // Step 2: Poll for status
        let status = '';
        let images = [];
        let retries = 0;

        while (retries < 60) { // Retry max 60 times (around 3 minutes)
            const statusResponse = await axios.get(
                `https://api.starryai.com/creations/${creationId}/`,
                {
                    headers: {
                        'X-API-Key': API_KEY,
                        'Accept': 'application/json'
                    }
                }
            );

            status = statusResponse.data.status;
            console.log(`[DEBUG] Current status: ${status} (retry ${retries + 1}/60)`);

            if (status === 'completed') {
                images = statusResponse.data.images.map(img => img.url);
                break;
            } else if (status === 'failed') {
                throw new Error('Image generation failed.');
            }

            // Wait 3 seconds
            await new Promise(resolve => setTimeout(resolve, 3000));
            retries++;
        }

        if (images.length === 0) {
            return res.status(500).json({ error: 'Image generation timed out after 3 minutes.' });
        }

        // Step 3: Return final images
        res.json({ images });

    } catch (error) {
        console.error('[ERROR] API Request failed:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to generate output.', details: error.response ? error.response.data : error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`[INFO] Server running on http://localhost:${port}`);
});