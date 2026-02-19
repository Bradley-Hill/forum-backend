import Express from "express";
import categoryRoutes from "./routes/categoryRoutes";
import threadRoutes from "./routes/threadRoutes";

const app = Express();
const port = process.env.PORT || 3000;

app.use(Express.json());
app.use('/api', threadRoutes);
app.use('/api', categoryRoutes);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
