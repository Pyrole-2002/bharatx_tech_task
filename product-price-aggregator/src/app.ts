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

app.use(express.static(path.join(__dirname, "../public")));

setRoutes(app);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Frontend available at: http://localhost:${PORT}`);
    console.log(`API endpoint: http://localhost:${PORT}/api/prices`);
});
