const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const port = 3000;

// Your StarryAI API Key
const API_KEY = 'NYo6Sx1lutC92_o98m6NET7RNDdQZw';

// Create images folder if not exists
const imagesFolder = path.join(__dirname, 'images');
fs.ensureDirSync(imagesFolder);

// Middleware
app.use(bodyParser.json());

// Serve images statically
app.use('/images', express.static(imagesFolder));

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
        let starryImages = [];
        let retries = 0;

        while (retries < 60) {
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
                starryImages = statusResponse.data.images.map(img => img.url);
                break;
            } else if (status === 'failed') {
                throw new Error('Image generation failed.');
            }

            await new Promise(resolve => setTimeout(resolve, 3000));
            retries++;
        }

        if (starryImages.length === 0) {
            return res.status(500).json({ error: 'Image generation timed out after 3 minutes.' });
        }

        // Step 3: Download images and save locally
        const myServerUrls = [];

        for (let i = 0; i < starryImages.length; i++) {
            const imgUrl = starryImages[i];
            const fileName = `generated_${Date.now()}_${i}.jpg`;
            const filePath = path.join(imagesFolder, fileName);

            const imgData = await axios.get(imgUrl, { responseType: 'arraybuffer' });
            await fs.writeFile(filePath, imgData.data);

            // Push your hosted URL
            myServerUrls.push(`https://ai-art-hassan-api-pw4i.onrender.com/images/${fileName}`);
            // NOTE: Change "yourdomain.com" to your actual hosting domain when you deploy!
        }

        // Step 4: Return YOUR server image links
        res.json({ images: myServerUrls });

    } catch (error) {
        console.error('[ERROR] API Request failed:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to generate output.', details: error.response ? error.response.data : error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`[INFO] Server running on http://localhost:${port}`);
});
