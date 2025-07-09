export interface ProductResult {
    link: string;
    price: string;
    currency: string;
    productName: string;
    parameters: string;
    source: string;
}

export interface SearchQuery {
    country: string;
    query: string;
}
