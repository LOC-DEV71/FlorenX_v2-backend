const https = require('https');

https.get('https://image.pollinations.ai/prompt/elon-musk-trillionaire', (res) => {
    console.log("Status Code:", res.statusCode);
    console.log("Headers:", res.headers);
    res.on('data', () => {});
    res.on('end', () => console.log("Done"));
}).on('error', (e) => {
    console.error("Error:", e);
});
