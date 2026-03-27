import Express from "express";
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

export default app;