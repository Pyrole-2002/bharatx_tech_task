import { Router, Express } from 'express';
import PriceAggregatorController from '../controllers';

const router = Router();
const priceAggregatorController = new PriceAggregatorController();

export function setRoutes(app: Express) {
    app.use('/api/prices', router);
    router.get('/', priceAggregatorController.fetchPrices.bind(priceAggregatorController));
}
