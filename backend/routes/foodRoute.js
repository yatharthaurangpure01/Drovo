import express from "express";
import { addFood, listFood, removeFood, giveFood, editFood } from "../controller/foodController.js";
import shopAuthMiddleware from "../middlewares/shopAuthMiddleware.js";

const foodRouter = express.Router();

foodRouter.post(
    "/add",
    shopAuthMiddleware,
    addFood
);

foodRouter.post(
    "/edit/:id",
    shopAuthMiddleware,
    editFood
);

foodRouter.get("/list/:shopId?", listFood);
foodRouter.post("/remove", shopAuthMiddleware, removeFood);
foodRouter.get("/:id", shopAuthMiddleware, giveFood);

export default foodRouter;
