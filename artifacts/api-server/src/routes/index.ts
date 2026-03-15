import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import transactionsRouter from "./transactions.js";
import insightsRouter from "./insights.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/transactions", transactionsRouter);
router.use("/insights", insightsRouter);

export default router;
