import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProductResult, SearchQuery } from "../types";
import config from "../config";

class PriceFetcherService {
    private genAI: GoogleGenerativeAI;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        console.log("🔑 API Key Status:", {
            exists: !!apiKey,
            length: apiKey?.length || 0,
            prefix: apiKey?.substring(0, 10) + "..." || "none",
        });

        this.genAI = new GoogleGenerativeAI(apiKey || "");
    }

    public async fetchPrices(
        searchQuery: SearchQuery
    ): Promise<ProductResult[]> {
        const { country, query } = searchQuery;

        try {
            // Use AI to extract product keywords and determine relevant websites
            const productInfo = await this.extractProductInfo(query, country);

            const allResults: ProductResult[] = [];

            // Fetch from multiple sources based on country
            const websites = this.getWebsitesForCountry(country);

            for (const website of websites) {
                try {
                    const results = await this.scrapeWebsite(
                        website,
                        query,
                        country,
                        productInfo
                    );
                    allResults.push(...results);
                } catch (error) {
                    console.error(`Error scraping ${website.name}:`, error);
                }
            }

            // Filter and sort results
            const filteredResults = this.filterAndValidateResults(
                allResults,
                productInfo
            );

            // Sort by price (ascending)
            filteredResults.sort((a, b) => {
                const priceA = this.extractNumericPrice(a.price);
                const priceB = this.extractNumericPrice(b.price);
                return priceA - priceB;
            });

            return filteredResults.slice(0, 10); // Return top 10 results
        } catch (error) {
            console.error("Error in fetchPrices:", error);
            return [];
        }
    }

    private async extractProductInfo(query: string, country: string) {
        try {
            const model = this.genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
            });

            const prompt = `Extract product info from: "${query}" for ${country}. Return only JSON: {"productType":"category","brand":"brand","keywords":["key","words"],"specifications":["specs"],"currency":"${this.getCurrencyForCountry(
                country
            )}"}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response
                .text()
                .replace(/```json\n?/g, "")
                .replace(/```\n?/g, "")
                .trim();

            console.log("🤖 AI Response:", text);
            return JSON.parse(text);
        } catch (error) {
            console.error(
                "🚨 AI extraction failed, using enhanced fallback:",
                error instanceof Error ? error.message : String(error)
            );
            return this.createEnhancedFallback(query, country);
        }
    }

    private createEnhancedFallback(query: string, country: string) {
        const queryLower = query.toLowerCase();

        const allWords = query
            .split(/[\s,]+/)
            .filter((word) => word.length > 2);
        const keywords = allWords.map((word) => word.toLowerCase());

        const specs: string[] = [];
        const specPatterns = [
            /\d+\s?GB/gi,
            /\d+\s?TB/gi,
            /Pro/gi,
            /Max/gi,
            /Plus/gi,
            /Mini/gi,
            /Air/gi,
            /\d+\s?inch/gi,
            /\d+"/gi,
        ];

        specPatterns.forEach((pattern) => {
            const matches = query.match(pattern);
            if (matches) specs.push(...matches);
        });

        // Better product type detection
        let productType = "general";
        if (
            queryLower.includes("iphone") ||
            queryLower.includes("phone") ||
            queryLower.includes("mobile")
        ) {
            productType = "smartphone";
        } else if (
            queryLower.includes("laptop") ||
            queryLower.includes("macbook")
        ) {
            productType = "laptop";
        } else if (
            queryLower.includes("headphone") ||
            queryLower.includes("earphone") ||
            queryLower.includes("airdopes")
        ) {
            productType = "headphones";
        }

        const fallback = {
            productType,
            brand: this.extractBrandFromQuery(query),
            model: "",
            keywords,
            specifications: specs,
            currency: this.getCurrencyForCountry(country),
        };

        console.log("🔄 Using enhanced fallback:", fallback);
        return fallback;
    }

    private extractBrandFromQuery(query: string): string {
        const brands = [
            "Apple",
            "Samsung",
            "Google",
            "OnePlus",
            "iPhone",
            "boAt",
            "Sony",
            "Nike",
            "Adidas",
        ];
        const queryUpper = query.toUpperCase();
        return (
            brands.find((brand) => queryUpper.includes(brand.toUpperCase())) ||
            ""
        );
    }

    private getCurrencyForCountry(country: string): string {
        const currencyMap: { [key: string]: string } = {
            US: "USD",
            IN: "INR",
            UK: "GBP",
            CA: "CAD",
        };
        return currencyMap[country.toUpperCase()] || "USD";
    }

    private getWebsitesForCountry(country: string) {
        const websiteMap: {
            [key: string]: Array<{
                name: string;
                baseUrl: string;
                searchPath: string;
            }>;
        } = {
            US: [
                {
                    name: "Amazon",
                    baseUrl: "https://www.amazon.com",
                    searchPath: "/s?k=",
                },
                {
                    name: "eBay",
                    baseUrl: "https://www.ebay.com",
                    searchPath: "/sch/i.html?_nkw=",
                },
                {
                    name: "Walmart",
                    baseUrl: "https://www.walmart.com",
                    searchPath: "/search?q=",
                },
            ],
            IN: [
                {
                    name: "Amazon India",
                    baseUrl: "https://www.amazon.in",
                    searchPath: "/s?k=",
                },
                {
                    name: "Flipkart",
                    baseUrl: "https://www.flipkart.com",
                    searchPath: "/search?q=",
                },
                {
                    name: "Snapdeal",
                    baseUrl: "https://www.snapdeal.com",
                    searchPath: "/search?keyword=",
                },
            ],
            UK: [
                {
                    name: "Amazon UK",
                    baseUrl: "https://www.amazon.co.uk",
                    searchPath: "/s?k=",
                },
                {
                    name: "eBay UK",
                    baseUrl: "https://www.ebay.co.uk",
                    searchPath: "/sch/i.html?_nkw=",
                },
            ],
            CA: [
                {
                    name: "Amazon Canada",
                    baseUrl: "https://www.amazon.ca",
                    searchPath: "/s?k=",
                },
                {
                    name: "eBay Canada",
                    baseUrl: "https://www.ebay.ca",
                    searchPath: "/sch/i.html?_nkw=",
                },
            ],
        };

        const countryKey = country.toUpperCase();
        return websiteMap[countryKey] || websiteMap["US"];
    }

    private async scrapeWebsite(
        website: any,
        query: string,
        country: string,
        productInfo: any
    ): Promise<ProductResult[]> {
        const results: ProductResult[] = [];

        try {
            console.log(`🕷️  Scraping ${website.name} for: ${query}`);

            // Try Puppeteer first
            try {
                const puppeteerResults = await this.scrapeWithPuppeteer(
                    website,
                    query,
                    productInfo
                );
                if (puppeteerResults.length > 0) {
                    return puppeteerResults;
                }
            } catch (error) {
                console.log(
                    `❌ Puppeteer failed for ${website.name}, trying Axios fallback...`
                );
            }

            // Fallback to Axios if Puppeteer fails
            const axiosResults = await this.scrapeWithAxios(
                website,
                query,
                productInfo
            );
            return axiosResults;
        } catch (error) {
            console.error(
                `💥 All scraping methods failed for ${website.name}:`,
                error instanceof Error ? error.message : String(error)
            );
            return [];
        }
    }

    private async scrapeWithPuppeteer(
        website: any,
        query: string,
        productInfo: any
    ): Promise<ProductResult[]> {
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",
                "--disable-gpu",
                "--disable-blink-features=AutomationControlled",
                "--disable-features=VizDisplayCompositor",
            ],
        });

        try {
            const page = await browser.newPage();

            // Better stealth configuration
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, "webdriver", {
                    get: () => undefined,
                });
            });

            await page.setViewport({ width: 1366, height: 768 });
            await page.setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
            );

            const searchUrl = `${website.baseUrl}${
                website.searchPath
            }${encodeURIComponent(query)}`;
            console.log(`🔗 Loading: ${searchUrl}`);

            await page.goto(searchUrl, {
                waitUntil: "domcontentloaded",
                timeout: 15000,
            });

            await new Promise((resolve) => setTimeout(resolve, 2000));

            const content = await page.content();
            const $ = cheerio.load(content);

            let results: ProductResult[] = [];
            if (website.name.includes("Amazon")) {
                results = this.scrapeAmazon($, website.baseUrl, productInfo);
            } else if (website.name.includes("eBay")) {
                results = this.scrapeEbay($, website.baseUrl, productInfo);
            } else if (website.name.includes("Flipkart")) {
                results = this.scrapeFlipkart($, website.baseUrl, productInfo);
            }

            console.log(
                `✅ Found ${results.length} results from ${website.name} via Puppeteer`
            );
            return results;
        } finally {
            await browser.close();
        }
    }

    private async scrapeWithAxios(
        website: any,
        query: string,
        productInfo: any
    ): Promise<ProductResult[]> {
        try {
            const searchUrl = `${website.baseUrl}${
                website.searchPath
            }${encodeURIComponent(query)}`;
            console.log(`🔗 Axios fallback for: ${searchUrl}`);

            const response = await axios.get(searchUrl, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Accept-Encoding": "gzip, deflate",
                    Connection: "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                },
                timeout: 10000,
            });

            const $ = cheerio.load(response.data);

            let results: ProductResult[] = [];
            if (website.name.includes("Amazon")) {
                results = this.scrapeAmazon($, website.baseUrl, productInfo);
            } else if (website.name.includes("eBay")) {
                results = this.scrapeEbay($, website.baseUrl, productInfo);
            } else if (website.name.includes("Flipkart")) {
                results = this.scrapeFlipkart($, website.baseUrl, productInfo);
            }

            console.log(
                `✅ Found ${results.length} results from ${website.name} via Axios`
            );
            return results;
        } catch (error) {
            console.error(
                `❌ Axios also failed for ${website.name}:`,
                error instanceof Error ? error.message : String(error)
            );
            return [];
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private scrapeAmazon(
        $: cheerio.CheerioAPI,
        baseUrl: string,
        productInfo: any
    ): ProductResult[] {
        const results: ProductResult[] = [];

        $('div[data-component-type="s-search-result"]').each((i, el) => {
            const element = $(el);

            const productName = element
                .find("h2 a span, h2 span")
                .text()
                .trim();
            const priceWhole = element.find(".a-price-whole").text().trim();
            const priceFraction = element
                .find(".a-price-fraction")
                .text()
                .trim();
            const priceSymbol = element.find(".a-price-symbol").text().trim();

            let price = "";
            if (priceWhole) {
                price = `${priceSymbol}${priceWhole}${
                    priceFraction ? "." + priceFraction : ""
                }`;
            }

            const relativeLink = element.find("h2 a").attr("href");
            const link = relativeLink ? `${baseUrl}${relativeLink}` : "";

            if (productName && price && link) {
                results.push({
                    productName,
                    price,
                    currency: productInfo.currency,
                    link,
                    parameters: this.extractParameters(
                        productName,
                        productInfo.specifications
                    ),
                    source: "Amazon",
                });
            }
        });

        return results;
    }

    private scrapeEbay(
        $: cheerio.CheerioAPI,
        baseUrl: string,
        productInfo: any
    ): ProductResult[] {
        const results: ProductResult[] = [];

        $(".s-item").each((i, el) => {
            const element = $(el);

            const productName = element.find(".s-item__title").text().trim();

            let price = element.find(".s-item__price").first().text().trim();
            if (price.includes(" ")) {
                price = price.split(" ")[0];
            }

            const link = element.find(".s-item__link").attr("href") || "";

            if (
                productName &&
                price &&
                link &&
                !productName.includes("Shop on eBay")
            ) {
                results.push({
                    productName,
                    price,
                    currency: productInfo.currency,
                    link,
                    parameters: this.extractParameters(
                        productName,
                        productInfo.specifications
                    ),
                    source: "eBay",
                });
            }
        });

        return results;
    }

    private scrapeFlipkart(
        $: cheerio.CheerioAPI,
        baseUrl: string,
        productInfo: any
    ): ProductResult[] {
        const results: ProductResult[] = [];

        $("._1AtVbE").each((i, el) => {
            const element = $(el);

            const productName = element.find("._4rR01T").text().trim();
            const price = element.find("._30jeq3").text().trim();
            const link = baseUrl + element.find("._1fQZEK").attr("href");

            if (productName && price) {
                results.push({
                    productName,
                    price,
                    currency: productInfo.currency,
                    link,
                    parameters: this.extractParameters(
                        productName,
                        productInfo.specifications
                    ),
                    source: "Flipkart",
                });
            }
        });

        return results;
    }

    private extractParameters(
        productName: string,
        specifications: string[]
    ): string {
        const params: string[] = [];
        const nameUpper = productName.toUpperCase();

        specifications.forEach((spec) => {
            if (nameUpper.includes(spec.toUpperCase())) {
                params.push(spec);
            }
        });

        return params.join(", ");
    }

    private filterAndValidateResults(
        results: ProductResult[],
        productInfo: any
    ): ProductResult[] {
        return results.filter((result) => {
            const nameLower = result.productName.toLowerCase();

            const matchesKeywords = productInfo.keywords.some(
                (keyword: string) => nameLower.includes(keyword.toLowerCase())
            );

            const hasValidPrice = this.extractNumericPrice(result.price) > 0;

            return matchesKeywords && hasValidPrice;
        });
    }

    private extractNumericPrice(price: string): number {
        const numericPrice = parseFloat(price.replace(/[^0-9.-]+/g, ""));
        return isNaN(numericPrice) ? 0 : numericPrice;
    }
}

export default PriceFetcherService;
