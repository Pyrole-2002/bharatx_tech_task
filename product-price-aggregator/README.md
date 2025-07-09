# Product Price Aggregator

## Overview
The Product Price Aggregator is an AI-powered tool designed to fetch and compare product prices from multiple e-commerce websites based on the consumer's country. The tool uses Google's Gemini AI to intelligently parse queries and extract relevant product information.

## Features
- AI-powered product query analysis using Google Gemini
- Fetches product prices from multiple websites (Amazon, eBay, Walmart, Flipkart)
- Supports multiple countries (US, CA, UK, IN)
- Intelligent product matching and filtering
- Results ranked by price (ascending)
- Dockerized for easy deployment
- Web frontend for easy testing

## Setup Instructions

### Local Development
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```
4. Start the application:
   ```bash
   npm start
   ```

### Docker
1. Build the Docker image:
   ```bash
   docker build -t product-price-aggregator .
   ```
2. Run the container:
   ```bash
   docker run -p 3000:3000 -e GEMINI_API_KEY=your_api_key product-price-aggregator
   ```

## API Usage

### Test the iPhone Query (Required)
```bash
curl "http://localhost:3000/api/prices?country=US&query=iPhone%2016%20Pro,%20128GB"
```

### Test India Query
```bash
curl "http://localhost:3000/api/prices?country=IN&query=boAt%20Airdopes%20311%20Pro"
```

### Other Examples
```bash
# Laptop in UK
curl "http://localhost:3000/api/prices?country=UK&query=MacBook%20Pro%2014%20inch"

# Headphones in Canada  
curl "http://localhost:3000/api/prices?country=CA&query=Sony%20WH-1000XM4"
```

## Response Format
```json
[
  {
    "link": "https://amazon.com/...",
    "price": "$999.99",
    "currency": "USD", 
    "productName": "Apple iPhone 15 Pro, 128GB, Natural Titanium",
    "parameters": "128GB, Pro",
    "source": "Amazon"
  }
]
```

## Supported Countries
- **US**: Amazon, eBay, Walmart
- **IN**: Amazon India, Flipkart, Snapdeal  
- **UK**: Amazon UK, eBay UK
- **CA**: Amazon Canada, eBay Canada

## AI Integration
The tool uses Google's Gemini AI to:
- Extract product categories and specifications from queries
- Identify relevant keywords for better matching
- Determine appropriate currency for each country
- Improve search accuracy across different websites

## Technical Features
- **Web Scraping**: Uses Puppeteer for JavaScript-heavy sites with Axios fallback
- **AI Analysis**: Gemini AI for intelligent query processing
- **Multi-site Support**: Extensible architecture for adding new e-commerce sites
- **Error Handling**: Graceful degradation when sites are unavailable
- **Rate Limiting**: Built-in delays to avoid being blocked

## Proof of Working

### Successfully tested with required query:
```bash
curl "http://localhost:3000/api/prices?country=US&query=iPhone%2016%20Pro,%20128GB"
```

**Sample Response:**
```json
[
  {
    "productName": "iPhone 16 Pro A3106 256GB – For Parts Only – Excellent Condition",
    "price": "$199.00",
    "currency": "USD",
    "link": "https://www.ebay.com/itm/116681167867",
    "parameters": "Pro",
    "source": "eBay"
  }
]
```

## License
Apache License 2.0
