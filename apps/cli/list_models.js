const https = require('https');
require("dotenv").config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("No API Key found");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", JSON.stringify(json.error, null, 2));
            } else if (json.models) {
                console.log("Available Models:");
                json.models.forEach(m => console.log(`- ${m.name}`));
            } else {
                console.log("Unexpected response:", data);
            }
        } catch (e) {
            console.error("Parse error:", e.message);
            console.log("Raw data:", data);
        }
    });
}).on('error', (err) => {
    console.error("Request error:", err.message);
});
