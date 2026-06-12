require("dotenv").config();

async function list() {
  try {
     const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
     const data = await response.json();
     console.log(JSON.stringify(data, null, 2));
  } catch(e) {
     console.error(e);
  }
}
list();
