import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import transactionsRouter from "./transactions.js";
import insightsRouter from "./insights.js";
import modelsRouter from "./models.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/transactions", transactionsRouter);
router.use("/insights", insightsRouter);
router.use("/models", modelsRouter);

export default router;
