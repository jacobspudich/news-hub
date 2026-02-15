// API Configuration
// INSTRUCTIONS: 
// 1. Copy this file and rename it to "config.js"
// 2. Replace the placeholder values with your actual API keys
// 3. Never commit config.js to GitHub (it's in .gitignore)

const API_CONFIG = {
    // Get your NY Times API key from: https://developer.nytimes.com/
    NYT_API_KEY: 'YOUR_NYT_API_KEY_HERE',
    
    // Get your NewsAPI key from: https://newsapi.org/
    NEWS_API_KEY: 'YOUR_NEWSAPI_KEY_HERE',
    
    // Get your Guardian API key from: https://open-platform.theguardian.com/
    GUARDIAN_API_KEY: 'YOUR_GUARDIAN_API_KEY_HERE'
};

const outlets = [
    { name: 'CNN', url: 'https://cnn.com', color: '#CC0000' },
    { name: 'Reuters', url: 'https://reuters.com', color: '#FF6600' },
    { name: 'NPR', url: 'https://npr.org', color: '#1A1A1A' },
    { name: 'NBC', url: 'https://nbcnews.com', color: '#FFD700' },
    { name: 'ABC', url: 'https://abcnews.go.com', color: '#FFD500' },
    { name: 'ESPN', url: 'https://espn.com', color: '#D50A0A' },
    { name: 'AP News', url: 'https://apnews.com', color: '#E41E13' },
    { name: 'NY Times', url: 'https://nytimes.com', color: '#000000' },
    { name: 'WSJ', url: 'https://wsj.com', color: '#2E2E2E' },
    { name: 'The Guardian', url: 'https://theguardian.com', color: '#052962' }
];

const newsApiSources = {
    'CNN': 'cnn',
    'Reuters': 'reuters',
    'ABC': 'abc-news',
    'NBC': 'nbc-news',
    'ESPN': 'espn',
    'WSJ': 'the-wall-street-journal'
};