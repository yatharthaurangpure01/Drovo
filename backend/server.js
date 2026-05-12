import "dotenv/config"
import express from "express"
import cors from "cors"
import { connectDB } from "./config/db.js"
import foodRouter from "./routes/foodRoute.js"
import userRouter from "./routes/User-Route.js"
import shopRouter from "./routes/shopRoute.js"
import cartRouter from "./routes/cartRoute.js"
import orderRouter from "./routes/orderRoute.js"
import paymentRouter from "./routes/paymentRouter.js"

const app = express();
const PORT = process.env.PORT || 4000;


app.use(express.json({ limit: "10mb" }))
app.use(cors())

connectDB();


app.use("/api/food", foodRouter);
app.use("/api", userRouter);
app.use("/api/order", orderRouter);
app.use("/api/payment", paymentRouter);
app.use('/api/shops', shopRouter);

app.get("/", (req, res) => {
    res.send("Hello World");
})

app.listen(PORT, () => {
    console.log(`Server Started on http://localhost:${PORT}`);
})
