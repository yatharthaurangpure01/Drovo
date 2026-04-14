import orderModel from "../models/orderModel.js";
import userModel from "../models/UserModel.js";
import Shop from "../models/ShopModel.js";
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { sendEmailNotification } from '../utils/notifications.js';
import nodemailer from 'nodemailer'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
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

// Create Razorpay order for online payment with transfer details
const createOrder = async (req, res) => {
  const { amount, deliveryCharge, token, shopId } = req.body;

  console.log("amount ", typeof amount);
  console.log("deliveryCharge ", typeof deliveryCharge);
  if (!token || !shopId) {
    return res.status(401).json({ success: false, message: 'Unauthorized request or missing shopId' });
  }

  try {
    const shop = await Shop.findById(shopId);
    if (!shop || !shop.razorpayAccountId) {
      return res.status(400).json({ success: false, message: 'Shop not found or no linked account' });
    }

    const totalAmount = (amount + deliveryCharge) * 100; // Convert to paise
    console.log("totalAmount ", totalAmount);
    const shopAmount = Math.round(totalAmount * 0.99); // 99% to shopkeeper
    const platformCommission = totalAmount - shopAmount; // 1% to platform
    console.log("shopAmount ", shopAmount)
    const options = {
      amount: totalAmount,
      currency: 'INR',
      receipt: `order_rcptid_${Date.now()}`,
      transfers: [
        {
          account: shop.razorpayAccountId,
          amount: shopAmount,
          currency: 'INR',
          notes: {
            purpose: 'Order payment to shopkeeper'
          }
        }
      ]
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order,
      platformCommission // Return commission for tracking
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, message: 'Server error while creating order' });
  }
};

// Verify Razorpay payment and save order
const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    items,
    amount,
    address,
    deliveryCharge,
    shopId
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Missing payment details' });
  }

  try {
    // Verify payment signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Save order
    const newOrder = new orderModel({
      userId,
      items,
      amount,
      address,
      deliveryCharge,
      shopId,
      paymentMethod: 'Online',
      paymentStatus: 'Completed',
      paymentDetails: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        paymentDate: new Date(),
        platformCommission: Math.round((amount + deliveryCharge) * 0.01) // 1% commission
      },
    });

    const order = await newOrder.save();

    // Clear user's cart
    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    // Fetch shop details for notification
    const shopDetails = await Shop.findById(shopId);
    if (!shopDetails) {
      return res.status(404).json({ success: false, message: "Shop not found." });
    }
    // Send notifications
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found.' });
    }

    console.log("Shop ", shop);

    const itemsList = items
      .map(item => `${item.name} (x${item.quantity})`)
      .join(', ');
    const shopAmount = (amount + deliveryCharge) * 0.99;
    const platformCommission = (amount + deliveryCharge) * 0.01;
    const emailBody = `Hello ${shop.name},\n\nA new order has been placed at your shop!\n\nOrder Details:\n- Order ID: ${order._id}\n- Items: ${itemsList}\n- Amount: ₹${amount}\n- Delivery Charge: ₹${deliveryCharge}\n- Payment Method: Online\n- Amount to Shopkeeper: ₹${shopAmount.toFixed(2)}\n- Platform Commission (1%): ₹${platformCommission.toFixed(2)}\n- User Address: ${address.street}\n\nPlease check your admin panel for more details.\n\nThank you for using Drovo!`;

    await sendEmailNotification(shop.email, 'New Order Placed', emailBody);


    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Server error while verifying payment' });
  }
};

// Place order (for COD)
const placeOrder = async (req, res) => {
  try {
    const newOrder = new orderModel({
      userId: req.body.userId,
      items: req.body.items,
      amount: req.body.amount,
      address: req.body.address,
      deliveryCharge: req.body.deliveryCharge,
      shopId: req.body.shopId,
      paymentMethod: 'COD',
      paymentStatus: 'Pending',
      paymentDetails: {
        platformCommission: Math.round((req.body.amount + req.body.deliveryCharge) * 0.01) // 1% commission
      },
    });

    const order = await newOrder.save();

    await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

    const shop = await Shop.findById(req.body.shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop not found." });
    }

    const itemsList = order.items
      .map(item => `${item.name} (x${item.quantity})`)
      .join(', ');

    const shopAmount = (req.body.amount + req.body.deliveryCharge) * 0.99;
    const platformCommission = (req.body.amount + req.body.deliveryCharge) * 0.01;
    const emailBody = `Hello ${shop.name},\n\nA new order has been placed at your shop!\n\nOrder Details:\n- Amount: ₹${req.body.amount}\n- Delivery Charge: ₹${req.body.deliveryCharge}\n- Payment Method: Cash on Delivery\n- Amount to Shopkeeper: ₹${shopAmount.toFixed(2)}\n- Platform Commission (1%): ₹${platformCommission.toFixed(2)}\n- User Address: ${req.body.address.street}\n\nPlease remit the platform commission to Drovo at the end of the month.\n\nPlease check your admin panel for more details.\n\nThank you for using Drovo!`;

    await sendEmailNotification(shop.email, 'New Order Placed', emailBody);


    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ success: false, message: "Error placing order." });
  }
};

const findOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await orderModel.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const shop = await Shop.findById(order.shopId);

    res.status(200).json({
      success: true,
      order,
      shop,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

const feedback = async (req, res) => {
  const { name, email, rating, message, shopEmail } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: email,
    to: shopEmail,
    subject: `Feedback from ${name}`,
    text: `
      Name: ${name}
      Email: ${email}
      Rating: ${rating}
      Message: ${message}
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send({ message: 'Feedback sent successfully' });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send({ message: 'Failed to send feedback' });
  }
};

const userOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({ userId: req.body.userId });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

const listOrders = async (req, res) => {
  const { token } = req.headers;
  let shopId = getShopIdFromToken(token);

  if (!shopId) {
    return res.status(400).json({ success: false, message: "Shop ID is required" });
  }

  try {
    const orders = await orderModel.find({ shopId });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

const updateStatus = async (req, res) => {
  const { orderId, status } = req.body;

  if (!orderId || !['Food Processing', 'Out for delivery', 'Delivered'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid order ID or status' });
  }

  try {
    const order = await orderModel.findByIdAndUpdate(orderId, { status }, { new: true });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const user = await userModel.findById(order.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const shop = await Shop.findById(order.shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    // Send notifications to user
    const itemsList = order.items
      .map(item => `${item.name} (x${item.quantity})`)
      .join(', ');
    const emailBody = `Hello ${user.name},\n\nYour order from ${shop.name} has been updated!\n\nOrder Details:\n- Order ID: ${order._id}\n- Items: ${itemsList}\n- Status: ${status}\n- Amount: ₹${order.amount}\n- Delivery Charge: ₹${order.deliveryCharge}\n- Payment Method: ${order.paymentMethod}\n- Delivery Address: ${order.address.street}\n\nPlease contact the shop for any queries.\n\nThank you for using Drovo!`;

    if (user.email) {
      await sendEmailNotification(user.email, `Order #${order._id} Status Update`, emailBody);
    }

    res.json({ success: true, message: 'Status Updated', order });
  } catch (error) {
    console.error('Error updating status:', error);
    res.json({ success: false, message: 'Error updating status' });
  }
};

export { placeOrder, userOrders, listOrders, updateStatus, findOrder, feedback, createOrder, verifyPayment };