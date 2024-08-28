const aws = require("aws-sdk");
const axios = require("axios");

// Initialize AWS Secrets Manager client
const secretsManager = new aws.SecretsManager();

// Basic PII detection logic
const isPIIPresent = (text) => {
    // Simple regex patterns for demonstration. You should enhance this with more comprehensive checks.
    const piiPatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN e.g., 123-45-6789
        /\b\d{5}(-\d{4})?\b/,    // US ZIP code e.g., 12345 or 12345-6789
        /\b\d{16}\b/,            // Credit card-like 16-digit numbers
        /\b\d{4}-\d{4}-\d{4}-\d{4}\b/, // Another common credit card format e.g., 1234-5678-1234-5678
        /\b\d{3} \d{3} \d{3}\b/, // Some phone number formats e.g., 123 456 789
        /\b\d{10}\b/             // Another phone number format e.g., 1234567890
    ];

    return piiPatterns.some(pattern => pattern.test(text));
}

// Retrieve the ChatGPT API key from AWS Secrets Manager
async function getSecretValue() {
    const secret_name = "irogai/chatgptkey";
    const params = { SecretId: secret_name };

    return new Promise((resolve, reject) => {
        secretsManager.getSecretValue(params, (err, data) => {
            if (err) {
                reject(err);
            } else {
                if ("SecretString" in data) {
                    resolve(data.SecretString);
                } else {
                    const buff = Buffer.from(data.SecretBinary, "base64");
                    resolve(buff.toString("ascii"));
                }
            }
        });
    });
}

// Retry with exponential backoff in case of rate limits
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithBackoff(fn, retries = 5, delayMs = 1000) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            return await fn();
        } catch (error) {
            if (error.response && error.response.status === 429) {
                attempt++;
                const backoffDelay = delayMs * Math.pow(2, attempt);
                console.log(`Retrying in ${backoffDelay}ms...`);
                await delay(backoffDelay);
            } else {
                throw error;
            }
        }
    }
    throw new Error('Max retries exceeded');
}

// Function to call ChatGPT API
async function callChatGpt(apiUrl, headers, data) {
    return await axios.post(apiUrl, data, { headers });
}

exports.handler = async (event) => {
    let question = "";
    let answer = "";

    let input = event.body;
    if (!event.body.indexOf("WebKitFormBoundary") > 0) {
        input = Buffer.from(event.body, "base64").toString("ascii");
    }
    
    const boundaryRegex = /^--([^\r\n]+)/;
    const boundaryMatch = input.match(boundaryRegex);
    const boundary = boundaryMatch ? boundaryMatch[1] : null;
    const formdata = {};
    if (boundary) {
        const keyValuePairs = input
            .split(`${boundary}--`)[0]
            .split(`${boundary}\r\n`)
            .slice(1);

        keyValuePairs.forEach((pair) => {
            const match = pair.match(/name="([^"]+)"\r\n\r\n(.+)\r\n/);
            if (match) {
                const name = match[1];
                const value = match[2];
                formdata[name] = value;
            }
        });

        console.log(formdata);
    }

    question = formdata.question;
    answer = formdata.answer;

    // Check for PII in the answer
    if (isPIIPresent(answer)) {
        const respObj = { score: 100, explanation: "Answer contains PII." };
        const resp = {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(respObj),
        };
        return resp;
    }

    const chatgptPrompt = process.env.RELEVANCY_PROMPT + `
Question: ${question}
Answer: ${answer}`;
    console.log(chatgptPrompt);

    try {
        const secretValue = await getSecretValue();
        const apiKey = JSON.parse(secretValue).ChatgptKey;

        const apiUrl = "https://api.openai.com/v1/chat/completions";
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        };
        const data = {
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "user",
                    content: chatgptPrompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        };

        const res = await retryWithBackoff(() => callChatGpt(apiUrl, headers, data));
        console.log(res.data.choices[0].message.content);
        let response = res.data.choices[0].message.content;
        const scoreMatch = response.match(/\d+/);
        const score = scoreMatch ? parseInt(scoreMatch[0]) : null;

        // Safely handle the explanation part
        let explanation = response.includes("-") 
            ? response.split("-")[1].trim()
            : "Your response is not relevant to the question.";

        const respObj = { score: score, explanation: explanation };

        const resp = {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(respObj),
        };
        return resp;
    } catch (e) {
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: e.message }),
        };
    }
};