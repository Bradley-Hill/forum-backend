import Express from "express";
import categoryRoutes from "./routes/categoryRoutes";
import threadRoutes from "./routes/threadRoutes";
import authRoutes from "./routes/authRoutes";
import postRoutes from "./routes/postRoutes";

const app = Express();
const port = process.env.PORT || 3000;

app.use(Express.json());
app.use('/api/auth', authRoutes);
app.use('/api', threadRoutes);
app.use('/api', categoryRoutes);
app.use('/api', postRoutes)

app.get("/", (req, res) => {
  res.send("Hello World");
});

export default app;