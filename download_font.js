const https = require('https');
const fs = require('fs');

const file = fs.createWriteStream("Roboto-Regular.ttf");
https.get("https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Regular.ttf", function(response) {
  if (response.statusCode !== 200) {
      console.log("Failed to download: " + response.statusCode);
      process.exit(1);
  }
  response.pipe(file);
  file.on('finish', function() {
    file.close(); 
    console.log("Download complete");
  });
}).on('error', function(err) {
  fs.unlink("Roboto-Regular.ttf", () => {});
  console.log("Error: " + err.message);
});
