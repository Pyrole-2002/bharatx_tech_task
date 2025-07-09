const configuration = {
    port: process.env.PORT || 3000,
    apiKeys: {
        gemini: process.env.GEMINI_API_KEY || "",
    },
    baseUrls: {
        amazon: `https://www.amazon.com`,
        amazon_in: "https://www.amazon.in",
        amazon_uk: "https://www.amazon.co.uk",
        amazon_ca: "https://www.amazon.ca",
        ebay: "https://www.ebay.com",
        walmart: "https://www.walmart.com",
        flipkart: "https://www.flipkart.com",
    },
    defaultCountry: "US",
    supportedCountries: ["US", "CA", "UK", "IN"],
};

export default configuration;
