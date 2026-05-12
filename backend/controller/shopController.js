import Shop from "../models/ShopModel.js";
import foodModel from "../models/foodModel.js";
import { getShopIdFromToken } from "./foodController.js";

// Haversine formula to calculate distance between two coordinates (in km)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const shopDetails = async (req, res) => {
  try {
    const { token } = req.headers;
    let shopId = getShopIdFromToken(token);

    const shop = await Shop.findById(shopId);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }
    res.status(200).json({
      success: true,
      shop: shop,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something Went Wrong, retry again !",
      error: error.message,
    });
  }
};

const fetchAllShops = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;
    const currentDate = new Date();
    let query = { subEndDate: { $gte: currentDate } };
    let shops = await Shop.find(query);

    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);

      if (isNaN(userLat) || isNaN(userLon)) {
        return res.status(400).json({
          success: false,
          message: "Invalid latitude or longitude",
        });
      }

      // Filter shops within radius and add distance
      shops = shops
        .map((shop) => {
          const shopLat = parseFloat(shop.shopAddress.latitude);
          const shopLon = parseFloat(shop.shopAddress.longitude);
          if (isNaN(shopLat) || isNaN(shopLon)) return null;
          const distance = getDistance(userLat, userLon, shopLat, shopLon);
          if (distance <= parseFloat(radius)) {
            return { ...shop._doc, distance };
          }
          return null;
        })
        .filter((shop) => shop !== null);

      // Sort shops by distance (nearest first)
      shops.sort((a, b) => a.distance - b.distance);

      return res.status(200).json({
        success: true,
        data: shops,
      });
    }

    // console.log("Shops ", shops);

    res.status(200).json({
      success: true,
      data: shops.slice(0, 6),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch shops",
      error: error.message,
    });
  }
};

// GET /api/shop/:shopId
const findShop = async (req, res) => {
  const { shopId } = req.params;

  try {
    const shop = await Shop.findById(shopId);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const foodItems = await foodModel.find({ shop: shopId });

    const coordinates = {
      lat: shop.shopAddress.latitude,
      lng: shop.shopAddress.longitude,
    };

    res.status(200).json({
      success: true,
      data: {
        shop,
        foodItems,
        coordinates,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch shop details",
      error: error.message,
    });
  }
};

export { fetchAllShops, findShop, shopDetails };
