import foodModel from "../models/foodModel.js";
import jwt from 'jsonwebtoken';
import cloudinary from 'cloudinary';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const getShopIdFromToken = (token) => {
  try {
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
};

const addFood = async (req, res) => {
  const { name, description, price, category, quantity, unit, image } = req.body;
  const { token } = req.headers;

  let shopId = getShopIdFromToken(token);
  if (!shopId) {
    return res.status(400).json({ success: false, message: "Shop ID is required" });
  }

  if (!image) {
    return res.status(400).json({ success: false, message: "Image is required." });
  }

  try {
    const result = await cloudinary.v2.uploader.upload(image, {
      folder: `drovo/food`,
      transformation: [
        { width: 800, height: 800, crop: 'limit', quality: 'auto', dpr: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    const food = new foodModel({
      name,
      description,
      price,
      category,
      quantity,
      unit,
      image: result.secure_url,
      shop: shopId
    });

    await food.save();
    res.json({ success: true, message: "Food Added", data: food });
  } catch (error) {
    console.error("Error adding food:", error);
    res.status(500).json({ success: false, message: "Something went wrong, please try again!" });
  }
};

const editFood = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, unit, quantity, image } = req.body;

  try {
    const foodItem = await foodModel.findById(id);
    if (!foodItem) {
      return res.status(404).json({ success: false, message: "Food item not found." });
    }

    let imageUrl = foodItem.image;
    if (image) {
      // Delete old image if it exists and a new image is provided
      if (foodItem.image) {
        try {
          // Extract publicId: everything after 'drovo/food/' and before the file extension
          const urlParts = foodItem.image.split('/');
          const uploadIndex = urlParts.findIndex(part => part === 'upload');
          if (uploadIndex === -1) throw new Error("Invalid Cloudinary URL");

          const versionIndex = urlParts[uploadIndex + 1].startsWith('v') ? uploadIndex + 2 : uploadIndex + 1;
          const publicId = urlParts.slice(versionIndex).join('/').split('.')[0];
          await cloudinary.v2.uploader.destroy(`drovo/food/${publicId}`);
        } catch (error) {
          console.warn("Failed to delete old image from Cloudinary:", error.message);
        }
      }
      // Upload new image
      const result = await cloudinary.v2.uploader.upload(image, {
        folder: `drovo/food`,
        transformation: [
          { width: 800, height: 800, crop: 'limit', quality: 'auto', dpr: 'auto' },
          { fetch_format: 'auto' }
        ]
      });
      imageUrl = result.secure_url;
    }

    foodItem.name = name || foodItem.name;
    foodItem.description = description || foodItem.description;
    foodItem.price = price || foodItem.price;
    foodItem.category = category || foodItem.category;
    foodItem.unit = unit || foodItem.unit;
    foodItem.quantity = quantity || foodItem.quantity;
    foodItem.image = imageUrl;

    await foodItem.save();
    return res.status(200).json({ success: true, message: "Food item updated successfully.", data: foodItem });
  } catch (error) {
    console.error("Error updating food item:", error);
    return res.status(500).json({ success: false, message: "Error updating food item." });
  }
};

const listFood = async (req, res) => {
  const { token } = req.headers;
  const { shopId: shopIdFromUrl } = req.params;

  let shopId;
  if (shopIdFromUrl) {
    shopId = shopIdFromUrl;
  } else if (token) {
    shopId = getShopIdFromToken(token);
  }

  if (!shopId) {
    return res.status(400).json({ success: false, message: "Shop ID or valid token is required" });
  }

  try {
    const foods = await foodModel.find({ shop: shopId });
    res.json({ success: true, data: foods });
  } catch (error) {
    console.error("Error fetching food items:", error.message);
    res.status(500).json({ success: false, message: "Error fetching food items" });
  }
};

// Get single food iftem
const giveFood = async (req, res) => {
  const { id } = req.params;

  try {
    const food = await foodModel.findById(id);
    if (!food) {
      return res.status(404).json({ success: false, message: "Food item not found" });
    }
    res.json({ success: true, data: food });
  } catch (error) {
    console.error("Error fetching food details:", error.message);
    res.status(500).json({ success: false, message: "Error fetching food details" });
  }
};

// Remove food item
const removeFood = async (req, res) => {
  const { id } = req.body;
  const { token } = req.headers;
  let shopId = getShopIdFromToken(token);

  if (!id || !shopId) {
    return res.status(400).json({ success: false, message: "Food ID and Shop ID are required" });
  }

  try {
    const food = await foodModel.findOne({ _id: id, shop: shopId });
    if (!food) {
      return res.status(404).json({ success: false, message: "Food item not found or does not belong to the shop" });
    }

    if (food.image) {
      try {
        const urlParts = food.image.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        if (uploadIndex === -1) throw new Error("Invalid Cloudinary URL");
        const versionIndex = urlParts[uploadIndex + 1].startsWith('v') ? uploadIndex + 2 : uploadIndex + 1 - tip;
        const publicId = urlParts.slice(versionIndex).join('/').split('.')[0];
        await cloudinary.v2.uploader.destroy(`drovo/food/${publicId}`);
      } catch (error) {
        console.warn("Failed to delete image from Cloudinary:", error.message);
      }
    }

    await foodModel.findByIdAndDelete(id);
    res.json({ success: true, message: "Food Removed" });
  } catch (error) {
    console.error("Error removing food item:", error);
    res.status(500).json({ success: false, message: "Error removing food item" });
  }
};

export { addFood, listFood, removeFood, getShopIdFromToken, giveFood, editFood };