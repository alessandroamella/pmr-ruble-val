import { createServer, type Server } from "node:http";
import type { Express } from "express";

const API_BASE_URL = process.env.VITE_API_BASE_URL || "http://localhost:8490";

export async function registerRoutes(app: Express): Promise<Server> {
  // Proxy endpoint for getting latest rate for a specific currency
  app.get("/api/rates/:currency/latest", async (req, res) => {
    try {
      const { currency } = req.params;
      const url = `${API_BASE_URL}/api/rates/${currency}/latest`;

      const response = await fetch(url);

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Failed to fetch data for ${currency}`
        });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error("Error fetching latest rate:", error);
      return res.status(500).json({
        error: "Internal server error while fetching currency data"
      });
    }
  });

  // Proxy endpoint for getting historical rates
  app.get("/api/rates", async (req, res) => {
    try {
      const { startDate, endDate, currencies } = req.query;

      // Validate required parameters
      if (!startDate || !endDate || !currencies) {
        return res.status(400).json({
          error: "Missing required parameters: startDate, endDate, and currencies"
        });
      }

      // Build the query string
      const queryParams = new URLSearchParams({
        startDate: startDate as string,
        endDate: endDate as string,
        currencies: currencies as string
      });

      const url = `${API_BASE_URL}/api/rates?${queryParams}`;

      const response = await fetch(url);

      if (!response.ok) {
        return res.status(response.status).json({
          error: "Failed to fetch historical rate data"
        });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error("Error fetching historical rates:", error);
      return res.status(500).json({
        error: "Internal server error while fetching historical data"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
