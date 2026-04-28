import React, { useContext, useEffect, useState } from 'react';
import './Cart.css';
import { StoreContext } from '../../context/storeContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { ShoppingCart, Store, Trash } from 'lucide-react';

const Cart = ({ setShowLogin }) => {
  const { cartItems, food_list, removeFromCart, addToCart, getTotalCartAmount, url, token, shopId, deleteFromCart, logout } = useContext(StoreContext);
  const navigate = useNavigate();
  const [shopDetails, setShopDetails] = useState(null);
  const [promoCode, setPromoCode] = useState("");

  // Fetch shop details when the component mounts
  useEffect(() => {
    const fetchShopDetails = async () => {
      try {
        if (shopId) {
          const response = await axios.get(`${url}/api/shops/${shopId}`);
          if (response.data.success) {
            setShopDetails(response.data.data.shop);
          }
        }
      } catch (error) {
        if (error.response && error.response.status === 401) {
          if (error.response.data.message === 'Token expired') {
            logout();
          }
        }
        console.log("fetchshopDetails function in cart.jsx: ", error);
      }
    };

    if (shopId) {
      fetchShopDetails();
    }
  }, [logout, shopId, url]);

  const isEligibleForCheckout = getTotalCartAmount() >= 60;

  const handlePromoCode = () => {
    setPromoCode("");
    toast.error("Invalid Code");
  };

  const handleCheckout = () => {
    if (!token) {
      setShowLogin(true);
      return;
    }

    if (!isEligibleForCheckout) {
      toast.error("Minimum purchase of ₹60 is required to checkout.");
      return;
    }

    navigate('/placeorder');
  };

  const getDisplayQuantity = (quantity, baseUnit) => {
    if (baseUnit === "grams") {
      const kg = Math.floor(quantity / 1000);
      const g = quantity % 1000;
      return kg > 0 ? `${kg} kg ${g > 0 ? g + " g" : ""}` : `${g} g`;
    } else if (baseUnit === "Kg") {
      return `${quantity} kg`;
    } else if (baseUnit === "ml") {
      const liters = Math.floor(quantity / 1000);
      const ml = quantity % 1000;
      return liters > 0 ? `${liters} l ${ml > 0 ? ml + " ml" : ""}` : `${ml} ml`;
    } else if (baseUnit === "Liter") {
      return `${quantity} l`;
    } else {
      return `${quantity} ${baseUnit}`;
    }
  };

  // Check if there are any items in the cart for this shop
  const hasItemsInCart = Object.keys(cartItems[shopId] || {}).some(itemId => cartItems[shopId][itemId] > 0);

  return (
    <div className="cart-page">
      <div className="cart-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          Back
        </button>
        <h1>Your Cart</h1>
        {shopDetails && hasItemsInCart && (
          <div className="shop-badge">
            <Store />
            {shopDetails.name}
          </div>
        )}
      </div>

      {!hasItemsInCart ? (
        <div className="empty-cart">
          <div className="empty-cart-icon"><ShoppingCart size={50} /></div>
          <h2>Your cart is empty</h2>
          <p>Add some delicious items to get started!</p>
          <button className="browse-btn" onClick={() => navigate('/')}>
            Browse Items
          </button>
        </div>
      ) : (
        <div className="cart-content">
          <div className="cart-items">
            {food_list.map((item, index) => {
              const itemQuantity = cartItems[shopId]?.[item._id] || 0;

              if (itemQuantity > 0) {
                return (
                  <div key={index} className="cart-item">
                    <div className="item-image">
                      <img src={item.image} alt={item.name} />
                    </div>

                    <div className="item-details">
                      <h3 className="cart-item-name">{item.name}</h3>
                      <p className="cart-item-price">₹{item.price}</p>
                      <p className="item-quantity-display">
                        {getDisplayQuantity(itemQuantity * item.quantity, item.unit)}
                      </p>
                    </div>

                    <div className="item-controls">
                      <div className="quantity-controls">
                        <button
                          className="quantity-btn minus"
                          onClick={() => removeFromCart(item._id, shopId)}
                        >
                          −
                        </button>
                        <span className="quantity-display">{itemQuantity}</span>
                        <button
                          className="quantity-btn plus"
                          onClick={() => addToCart(item._id, shopId)}
                        >
                          +
                        </button>
                      </div>

                      <div className="item-total">₹{item.price * itemQuantity}</div>

                      <button
                        className="remove-btn"
                        onClick={() => deleteFromCart(item._id, shopId)}
                      >
                        <Trash />
                      </button>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>

          <div className="cart-summary">
            <div className="promo-section">
              <div className="promo-input-group">
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="promo-input"
                />
                <button onClick={handlePromoCode} className="promo-btn">
                  Apply
                </button>
              </div>
            </div>

            <div className="total-section">

              <div className="total-row final-total">
                <span>Total</span>
                <span>₹{getTotalCartAmount()}</span>
              </div>
            </div>

            {!isEligibleForCheckout && (
              <div className="min-purchase-notice">
                Minimum purchase of ₹60 required to checkout
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={!isEligibleForCheckout}
              className={`checkout-btn ${isEligibleForCheckout ? 'enabled' : 'disabled'}`}
            >
              {isEligibleForCheckout ? 'Proceed to Checkout' : `Add ₹${60 - getTotalCartAmount()} more`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
