import { config } from "dotenv";
config();

import express from "express";
import path from "path";
import { setRoutes } from "./routes";
import configSettings from "./config";

const app = express();
const PORT = configSettings.port || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the correct path
app.use(express.static(path.join(__dirname, "../public")));

setRoutes(app);

// Root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || "development",
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: "Not Found",
        path: req.path,
        method: req.method,
    });
});

// For serverless deployment
if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log(`Frontend available at: http://localhost:${PORT}`);
        console.log(`API endpoint: http://localhost:${PORT}/api/prices`);
    });
}

// Export for Vercel
export default app;
