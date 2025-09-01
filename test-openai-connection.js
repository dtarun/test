const axios = require('axios');
require('dotenv').config();

/**
 * This script tests your connection to the OpenAI API.
 *
 * How to run:
 * 1. Make sure you have axios and dotenv installed:
 *    npm install axios dotenv
 * 2. Create a .env file in this directory with your key:
 *    OPENAI_API_KEY="your_openai_api_key_here"
 * 3. Run the script from your terminal:
 *    node test-openai-connection.js
 */
async function testOpenAIAccess() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

  if (!apiKey) {
    console.error('❌ ERROR: OPENAI_API_KEY is not set in your .env file.');
    console.error('Please create a .env file and add your OpenAI API key.');
    return;
  }

  console.log('🔑 API key found. Attempting to contact OpenAI...');
  console.log(`🤖 Using model: ${model}`);

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [{ role: 'user', content: 'Hello! In one short sentence, confirm you are working.' }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    const aiResponse = response.data.choices[0].message.content;

    console.log('\n✅ SUCCESS! OpenAI API is responding.');
    console.log('-----------------------------------------');
    console.log('AI Response:', aiResponse);
    console.log('-----------------------------------------');

  } catch (error) {
    console.error('\n❌ FAILED to connect to OpenAI API.');
    console.error('-----------------------------------------');
    if (error.response) {
      console.error('Status Code:', error.response.status);
      console.error('Response Data:', error.response.data);
      if (error.response.status === 401) {
        console.error('\nHint: A 401 Unauthorized error often means your API key is invalid or missing.');
      } else if (error.response.status === 429) {
        console.error('\nHint: A 429 error means you have hit your rate limit or your account has billing issues. Check your OpenAI account dashboard.');
      }
    } else {
      console.error('Error:', error.message);
    }
    console.error('-----------------------------------------');
  }
}

testOpenAIAccess();