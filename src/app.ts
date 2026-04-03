import Express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import categoryRoutes from "./routes/categoryRoutes";
import threadRoutes from "./routes/threadRoutes";
import authRoutes from "./routes/authRoutes";
import postRoutes from "./routes/postRoutes";
import userRoutes from "./routes/userRoutes";

const app = Express();
const port = process.env.PORT || 3000;

app.use(Express.json());
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api', threadRoutes);
app.use('/api', categoryRoutes);
app.use('/api', postRoutes)
app.use('/api', userRoutes)

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Endpoint not found",
    },
  });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error("[Error]", err);

  const status = (err instanceof Object && 'status' in err) ? (err.status as number) : 500;
  const code = (err instanceof Object && 'code' in err) ? (err.code as string) : "SERVER_ERROR";
  const message = (err instanceof Error) ? err.message : "An unexpected error occurred";

  res.status(status).json({
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === "development" && { details: err instanceof Error ? err.stack : String(err) }),
    },
  });
});

export default app;