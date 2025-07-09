import { Request, Response } from "express";
import PriceFetcherService from "../services";
import { SearchQuery } from "../types";

const priceFetcherService = new PriceFetcherService();

class PriceAggregatorController {
    async fetchPrices(req: Request, res: Response) {
        const query: SearchQuery = {
            query: req.query.query as string,
            country: req.query.country as string,
        };

        console.log("Received query:", query);

        const isValid = this.validateQuery(query);
        if (!isValid) {
            return res.status(400).json({
                error: 'Invalid query parameters. "country" and "query" are required.',
            });
        }

        try {
            const startTime = Date.now();
            const prices = await priceFetcherService.fetchPrices(query);
            const endTime = Date.now();

            console.log(
                `Query processed in ${endTime - startTime}ms, found ${
                    prices.length
                } results`
            );

            if (prices.length === 0) {
                return res.status(200).json({
                    message: "No products found matching the query.",
                    results: [],
                    searchInfo: {
                        query: query.query,
                        country: query.country,
                        processingTime: endTime - startTime,
                    },
                });
            }

            return res.status(200).json(prices);
        } catch (error) {
            console.error("Error in fetchPrices:", error);
            return res.status(500).json({
                error: "Failed to fetch prices",
                details:
                    process.env.NODE_ENV === "development"
                        ? error instanceof Error
                            ? error.message
                            : String(error)
                        : undefined,
            });
        }
    }

    validateQuery(query: SearchQuery): boolean {
        return !!(
            query.query &&
            query.query.trim() &&
            query.country &&
            query.country.trim()
        );
    }
}

export default PriceAggregatorController;
