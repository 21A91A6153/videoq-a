import express from 'express'
import fs from 'fs'
import { VertexAI } from '@google-cloud/vertexai';
import cors from 'cors'
import multer from 'multer';


const app = express();
const port = 3000;
const videoFile = multer({dest:"uploads/videos"})
app.use(express.json());
app.use(cors());

// Function to convert video file to base64
function convertVideoToBase64(filePath) {
    try {
        // Read the video file
        const videoData = fs.readFileSync(filePath);

        // Convert video data to base64
        const base64EncodedVideo = Buffer.from(videoData).toString('base64');

        return base64EncodedVideo;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// Function to generate content
async function generateContent(base64Video, userInputText) {
    try {
        // Initialize Vertex with your Cloud project and location
        const vertex_ai = new VertexAI({ project: 'rising-environs-417313', location: 'northamerica-northeast1' });
        const model = 'gemini-1.0-pro-vision-001';

        // Instantiate the models
        const generativeModel = vertex_ai.preview.getGenerativeModel({
            model: model,
            generation_config: {     
                "max_output_tokens": 2048,
                "temperature": 0.4,
                "top_p": 1,
                "top_k": 32
            },
            safety_settings: [
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" }
            ],
        });

        const req = {
            contents: [{
                role: 'user',
                parts: [
                    { inline_data: { mime_type: 'video/mp4', data: base64Video } },
                    { text: userInputText }
                ]
            }],
        };

        const streamingResp = await generativeModel.generateContentStream(req);
        const generatedTexts = [];

        for await (const item of streamingResp.stream) {
            if (item.candidates) {
                item.candidates.forEach(candidate => {
                    candidate.content.parts.forEach(part => {
                        if (part.text) {
                            generatedTexts.push(part.text);
                        }
                    });
                });
            }
        }

        return generatedTexts;
        // const streamingResp = await generativeModel.generateContentStream(req);
        // const generatedTexts = [];

        // if (!streamingResp || !streamingResp.stream) {
        //     console.error('Stream response is missing or empty.');
        //     return generatedTexts;
        // }

        // for await (const item of streamingResp.stream) {
        //     if (item.candidates) {
        //         item.candidates.forEach(candidate => {
        //             candidate.content.parts.forEach(part => {
        //                 if (part.text) {
        //                     generatedTexts.push(part.text);
        //                 }
        //             });
        //         });
        //     }
        // }

        // return generatedTexts;
    } catch (error) {
        console.error('Error:', error);
        throw error; // Rethrow the error to be caught by the caller
    }
}

// // API endpoint to generate content
// app.post('/generate-content' ,videoFile.any(), async (req, res) => {
//     const {userInputText } = req.body;
//     console.log(req.body)
//     console.log(req.files[0] + "aksljdfhklaj")
//     console.log(filePath);
//     const base64Video = convertVideoToBase64(filePath);

//     if (!base64Video) {
//         return res.status(500).json({ error: 'Failed to convert video to base64' });
//     }

//     try {
//         console.log("Here it is passing");
//         const generatedTexts = await generateContent(base64Video, userInputText);
//         res.json({ generatedTexts });
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to generate content', details: error.message });
//     }
// });

// API endpoint to generate content
app.post('/generate-content', videoFile.single('filePath'), async (req, res) => {
    const { userInputText } = req.body;
    const filePath = req.file.path; // Get the file path from multer
    // Convert video to base64
    const base64Video = convertVideoToBase64(filePath);

    if (!base64Video) {
        return res.status(500).json({ error: 'Failed to convert video to base64' });
    }

    try {
        const generatedTexts = await generateContent(base64Video, userInputText);
        res.json({ generatedTexts });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate content', details: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});