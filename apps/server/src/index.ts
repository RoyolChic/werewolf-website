import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { CLIENT_ORIGIN, PORT } from "./config/env";
import { healthRouter } from "./http/healthRoutes";
import { createSocketServer } from "./socket/socketServer";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.use(healthRouter);

const httpServer = createServer(app);
createSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
