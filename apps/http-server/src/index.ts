import express, { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth";
import boardsRouter from "./routes/boards";
import listsRouter from "./routes/lists";
import cardsRouter from "./routes/cards";

const app: Express = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/auth", authRouter);
app.use("/boards", boardsRouter);
app.use("/", listsRouter);
app.use("/", cardsRouter);

const PORT = process.env.PORT || 3002;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`HTTP server started on port ${PORT}`);
  });
}

export default app;
