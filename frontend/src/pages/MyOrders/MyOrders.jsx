import React, { useContext, useEffect, useState } from "react";
import "./MyOrders.css";
import { StoreContext } from "../../context/storeContext";
import axios from "axios";
import { assetsAdmin } from "../../assets/assetsAdmin";
import { useNavigate } from "react-router-dom";

const MyOrders = () => {
  const { url, token, logout } = useContext(StoreContext);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        url + "/api/order/userorders",
        {},
        { headers: { token } }
      );
      setData(response.data.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        if (error.response.data.message === "Token expired") {
          logout();
        }
      }
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    const options = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    };
    return new Date(date).toLocaleDateString("en-US", options);
  };

  const handleViewDetails = (orderId) => {
    navigate(`/myorders/${orderId}`);
  };

  const handleBack = () => {
    navigate("/");
  };

  const handleRefresh = () => {
    fetchOrders();
  };

  // Skeleton Component
  const OrderSkeleton = () => (
    <div className="skeleton-orders-container">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="skeleton-order-card" key={index}>
          <div className="skeleton-order-header">
            <div className="skeleton skeleton-icon"></div>
            <div className="skeleton skeleton-order-id"></div>
          </div>
          <div className="skeleton skeleton-order-items"></div>
          <div className="skeleton-order-details">
            <div className="skeleton skeleton-detail-row">
              <div className="skeleton skeleton-total"></div>
              <div className="skeleton skeleton-items-count"></div>
            </div>
            <div className="skeleton skeleton-status"></div>
            <div className="skeleton skeleton-date"></div>
            <div className="skeleton skeleton-button"></div>
          </div>
        </div>
      ))}
    </div>
  );

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token]);

  return (
    <div className="my-orders">
      <h2>My Orders</h2>

      <div className="order-buttons">
        <button onClick={handleBack} className="back-button">
          <span className="arrow-left">&#8592;</span>
          <span className="back-text">Back</span>
        </button>
        <button onClick={handleRefresh} className="refresh-button">
          <img src={assetsAdmin.refresh} alt="" className="refresh-icon" />
          <span className="refresh-text">Refresh</span>
        </button>
      </div>

      {loading ? (
        <OrderSkeleton />
      ) : data && data.length === 0 ? (
        <div className="no-orders">
          <p>You have not placed any orders yet.</p>
        </div>
      ) : data ? (
        <div className="orders-container">
          {data
            .slice()
            .reverse()
            .map((order, index) => {
              return (
                <div className="order-card" key={index}>
                  <div className="order-header">
                    <img src={assetsAdmin.parcel_icon} alt="Order Icon" />
                    <h3>Order #{order._id.slice(-6)}</h3>{" "}
                  </div>
                  <div className="order-items">
                    <p>
                      {order.items.map((item, index) => {
                        return `${item.name} - ${item.quantity}${index < order.items.length - 1 ? ", " : ""
                          }`;
                      })}
                    </p>
                  </div>
                  <div className="order-details">
                    <div className="order-details-row">
                      <p>
                        <strong>Total:</strong> &#8377; {order.amount}
                      </p>
                      <p>
                        <strong>Items:</strong> {order.items.length}
                      </p>
                    </div>
                    <p>
                      <span>&#x25cf;</span> <b>Status: {order.status}</b>
                    </p>
                    <p>
                      <strong>Order Date:</strong> {formatDate(order.date)}
                    </p>{" "}
                    {/* Show formatted date */}
                    <button onClick={() => handleViewDetails(order._id)}>
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="no-orders">
          <p>Failed to load orders. Please try again later.</p>
        </div>
      )}
    </div>
  );
};

export default MyOrders;