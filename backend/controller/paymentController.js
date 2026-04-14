import jwt from "jsonwebtoken";
import crypto from "crypto";
import Razorpay from "razorpay";
import cloudinary from "cloudinary";
import Shop from "../models/ShopModel.js";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Generate a secure key and IV for encryption
const ENCRYPTION_KEY = (() => {
  try {
    if (!process.env.ENCRYPTION_SECRET) {
      throw new Error("ENCRYPTION_SECRET is not defined in .env");
    }
    const key = Buffer.from(process.env.ENCRYPTION_SECRET, "hex");
    if (key.length !== 32) {
      throw new Error(
        `ENCRYPTION_SECRET must be a 32-byte hex string (64 characters). Got ${key.length} bytes. Raw value: "${process.env.ENCRYPTION_SECRET}"`
      );
    }
    return key;
  } catch (error) {
    console.error("Failed to initialize ENCRYPTION_SECRET:", error.message);
    throw error;
  }
})();

const IV_LENGTH = 16; // AES block size

// Encrypt bank details
const encryptBankDetails = (bankDetails) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(JSON.stringify(bankDetails), "utf8", "hex");
    encrypted += cipher.final("hex");
    console.log("Bank details encrypted successfully");
    return `${iv.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error(`Failed to encrypt bank details: ${error.message}`);
  }
};

// Decrypt bank details
const decryptBankDetails = (encrypted) => {
  try {
    const [ivHex, encryptedText] = encrypted.split(":");
    if (!ivHex || !encryptedText) {
      throw new Error("Invalid encrypted data format");
    }
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    console.log("Bank details decrypted successfully");
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error(`Failed to decrypt bank details: ${error.message}`);
  }
};

// Retry logic for API calls
const retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// Create a new order for subscription
const shopPayment = async (req, res) => {
  const { amount, token } = req.body;

  console.log("amount ", amount);
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized request" });
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: "Invalid amount" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const shop = await Shop.findById(decoded.id);
    if (!shop) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid shop token" });
    }

    const options = {
      amount, // Amount in paise
      currency: "INR",
      receipt: `order_rcptid_${Date.now()}`,
    };

    const order = await retry(() => razorpay.orders.create(options));

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating order",
      error: error.message,
    });
  }
};

// Create Razorpay linked account using fetch API
const createLinkedAccountWithFetch = async (shop) => {
  try {
    if (
      !shop.email ||
      !shop.phone ||
      !shop.name ||
      !shop.bankDetails?.accountNumber ||
      !shop.bankDetails?.ifscCode
    ) {
      throw new Error("Missing required shop details");
    }

    const accountDetails = {
      email: "yatharthmathasw@gmail.com",
      phone: shop.phone,
      type: "route",
      legal_business_name: shop.name,
      business_type: "individual",
      customer_facing_business_name: shop.name,
      contact_name: shop.name,
      reference_id: `shop_${Date.now()}`,
      profile: {
        category: "utilities",
        subcategory: "water",
        addresses: {
          registered: {
            street1: shop.shopAddress?.address || "Business Address",
            street2: shop.shopAddress?.street2 || "N/A",
            city: shop.shopAddress?.city || "Nagpur",
            state: shop.shopAddress?.state || "MAHARASHTRA",
            postal_code: shop.shopAddress?.postal_code || "440001",
            country: "IN",
          },
        },
      },
      legal_info: {
        pan: shop.bankDetails?.pan || "AAACL1234C", // Replace with actual PAN in production
        gst: shop.bankDetails?.gst || "",
      },
    };

    const credentials = btoa(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    );
    console.log(
      "Creating linked account with details:",
      JSON.stringify(accountDetails, null, 2)
    );

    const response = await retry(() =>
      fetch("https://api.razorpay.com/v2/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
          Accept: "application/json",
        },
        body: JSON.stringify(accountDetails),
      })
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Razorpay API Error:", {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });

      if (response.status === 400) {
        const errorDesc = responseData.error?.description || "Bad Request";
        if (
          errorDesc.includes("Route feature not enabled") ||
          errorDesc.includes("Marketplace feature is not enabled")
        ) {
          throw new Error(
            "Razorpay Route/Marketplace feature is not enabled. Please contact Razorpay support."
          );
        } else if (errorDesc.includes("Access Denied")) {
          throw new Error(
            "Access Denied: Verify API keys and ensure Route/partner permissions. Contact support@razorpay.com."
          );
        } else if (errorDesc.includes("Invalid category")) {
          throw new Error(
            "Invalid business category. Check category and subcategory values."
          );
        } else if (errorDesc.includes("email already exists")) {
          throw new Error("An account with this email already exists.");
        }
        throw new Error(`Razorpay API Error: ${errorDesc}`);
      }

      throw new Error(
        `HTTP ${response.status}: ${responseData.error?.description || response.statusText
        }`
      );
    }

    console.log("Linked account created successfully:", responseData.id);
    return responseData.id;
  } catch (error) {
    console.error(
      "Error creating Razorpay linked account:",
      JSON.stringify(error, null, 2)
    );
    throw error;
  }
};

// Verify payment and update shop
const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    name,
    address,
    street2,
    city,
    state,
    postal_code,
    pan,
    email,
    phone,
    subscription,
    latitude,
    longitude,
    shopImage,
    accountHolderName,
    accountNumber,
    ifscCode,
    browserNotificationOptIn,
    fcmToken,
    bankName,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res
      .status(400)
      .json({ success: false, message: "Missing payment details" });
  }

  if (!address || !street2 || !city || !state || !postal_code || !pan) {
    return res
      .status(400)
      .json({ success: false, message: "Missing address or PAN details" });
  }

  try {
    // Verify payment signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    // Find shop by email
    const shop = await Shop.findOne({ email });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    // Create Razorpay linked account
    let razorpayAccountId = null;
    try {
      razorpayAccountId = await createLinkedAccountWithFetch({
        name,
        email,
        phone,
        shopAddress: { address, street2, city, state, postal_code },
        bankDetails: {
          accountHolderName,
          accountNumber,
          ifscCode,
          bankName,
          pan,
        },
      });
    } catch (linkedAccountError) {
      console.error(
        "Failed to create linked account:",
        linkedAccountError.message
      );
      return res.status(400).json({
        success: false,
        message:
          "Failed to create linked account. Please try again or contact support.",
        error: linkedAccountError.message,
      });
    }

    // Upload shop image to Cloudinary if provided
    let imageUrl = shop.shopImage;
    if (shopImage) {
      if (shop.shopImage) {
        try {
          const urlParts = shop.shopImage.split("/");
          const uploadIndex = urlParts.findIndex((part) => part === "upload");
          if (uploadIndex === -1) throw new Error("Invalid Cloudinary URL");
          const versionIndex = urlParts[uploadIndex + 1].startsWith("v")
            ? uploadIndex + 2
            : uploadIndex + 1;
          const publicId = urlParts.slice(versionIndex).join("/").split(".")[0];
          await cloudinary.v2.uploader.destroy(`drovo/shop/${publicId}`);
        } catch (error) {
          console.warn(
            "Failed to delete old shop image from Cloudinary:",
            error.message
          );
        }
      }
      const result = await cloudinary.v2.uploader.upload(shopImage, {
        folder: `drovo/shop`,
        transformation: [
          {
            width: 800,
            height: 800,
            crop: "limit",
            quality: "auto",
            dpr: "auto",
          },
          { fetch_format: "auto" },
        ],
      });
      imageUrl = result.secure_url;
    }

    // Map subscription plan to days
    const durationMapping = {
      99: 15,
      149: 30,
      299: 90,
      599: 180,
    };

    const subscriptionDays = durationMapping[subscription];
    if (!subscriptionDays) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid subscription plan" });
    }

    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(
      subscriptionEndDate.getDate() + subscriptionDays
    );

    // Encrypt bank details
    const encryptedBankDetails = encryptBankDetails({
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      pan,
    });

    // Update shop
    const updateData = {
      name,
      shopAddress: {
        address,
        street2,
        city,
        state,
        postal_code,
        latitude,
        longitude,
      },
      phone,
      subscription,
      subEndDate: subscriptionEndDate,
      isSetupComplete: true,
      paymentDetails: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        paymentDate: new Date(),
      },
      shopImage: imageUrl,
      bankDetails: encryptedBankDetails,
      razorpayAccountId,
      browserNotificationOptIn: browserNotificationOptIn || false,
      fcmToken: fcmToken || "",
    };

    const updatedShop = await Shop.findByIdAndUpdate(shop._id, updateData, {
      new: true,
    });

    res.status(200).json({
      success: true,
      message: "Payment verified successfully and shop setup completed.",
      shop: updatedShop,
      razorpayAccountId,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Server error while verifying payment",
      error: error.message,
    });
  }
};

// Create a new order for subscription renewal
const createRenewalOrder = async (req, res) => {
  const { amount, token } = req.body;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized request" });
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: "Invalid amount" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const shop = await Shop.findById(decoded.id);
    if (!shop) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid shop token" });
    }

    const options = {
      amount: amount * 100, // Amount in paise
      currency: "INR",
      receipt: `renewal_rcptid_${Date.now()}`,
    };

    const order = await retry(() => razorpay.orders.create(options));

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error creating renewal order:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating renewal order",
      error: error.message,
    });
  }
};

// Verify the payment for subscription renewal
const verifyRenewalPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    subscription,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res
      .status(400)
      .json({ success: false, message: "Missing payment details" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized access" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const shopId = decodedToken.id;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === razorpay_signature) {
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return res
          .status(404)
          .json({ success: false, message: "Shop not found" });
      }

      const durationMapping = {
        99: 15,
        149: 30,
        299: 90,
        599: 180,
      };

      const subscriptionDays = durationMapping[subscription];
      if (!subscriptionDays) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid subscription plan" });
      }

      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + subscriptionDays);

      const updatedShop = await Shop.findByIdAndUpdate(
        shopId,
        {
          subscription,
          subEndDate: newEndDate,
          paymentDetails: {
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            paymentDate: new Date(),
          },
        },
        { new: true }
      );

      res.status(200).json({
        success: true,
        message: "Subscription renewed successfully.",
        shop: updatedShop,
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }
  } catch (error) {
    console.error("Error verifying renewal payment:", error);
    res.status(500).json({
      success: false,
      message: "Server error while verifying renewal payment",
      error: error.message,
    });
  }
};

export { shopPayment, verifyPayment, createRenewalOrder, verifyRenewalPayment };
