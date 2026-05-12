import React, { useContext, useEffect, useState } from 'react';
import './Orders.css';
import { toast } from "react-hot-toast";
import axios from "axios";
import { assetsAdmin } from "../../assets/assetsAdmin";
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { ShoppingBag } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { StoreContext } from '../../context/storeContext';

const Orders = ({ url }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const navigate = useNavigate();
  const { logout } = useContext(StoreContext);

  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      let token = localStorage.getItem("token");
      const response = await axios.get(url + "/api/order/list", {
        headers: { token }
      });

      if (response.data.success) {
        setOrders(response.data.data);
      } else {
        toast.error("Error fetching orders");
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        if (error.response.data.message === 'Token expired') {
          logout();
        }
      }

      if (error.response?.data?.redirect) {
        navigate(error.response.data.redirect);
        toast.error(error.response.data.message || "Please complete your setup or renew your subscription.");
      } else {
        toast.error("Error fetching orders");
      }
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusHandler = async (event, orderId) => {
    try {
      const response = await axios.post(url + "/api/order/status", {
        orderId,
        status: event.target.value
      });
      if (response.data.success) {
        toast.success("Order status updated!");
        await fetchAllOrders();
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        if (error.response.data.message === 'Token expired') {
          logout();
        }
      }
      toast.error("Error updating order status");
    }
  };

  const getDirections = (latitude, longitude) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank');
  };

  const formatDate = (date) => {
    const options = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    };
    return new Date(date).toLocaleDateString('en-US', options);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleScroll = () => {
    if (window.scrollY === 0) {
      setIsAtTop(true);
    } else {
      setIsAtTop(false);
    }
  };

  const OrderSkeleton = () => (
    <div className="order-item">
      <Skeleton height={60} width={60} />
      <div className="order-details">
        <Skeleton height={16} width="80%" />
        <Skeleton height={16} width="60%" />
        <Skeleton height={14} width="90%" />
        <Skeleton height={14} width="70%" />
        <Skeleton height={14} width="50%" />
        <Skeleton height={40} width="150px" />
      </div>
      <div className="order-summary">
        <Skeleton height={14} width="80%" />
        <Skeleton height={14} width="70%" />
        <Skeleton height={14} width="90%" />
        <Skeleton height={14} width="85%" />
        <Skeleton height={36} width="100%" />
      </div>
    </div>
  );

  const NoOrdersMessage = () => (
    <div className="no-orders-container">
      <ShoppingBag size={64} className="no-orders-icon" />
      <h3>No Orders Available</h3>
      <p>There are currently no orders to display. Orders will appear here once customers start placing them.</p>
    </div>
  );

  useEffect(() => {
    fetchAllOrders();
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="order-page">
      <h3>Order Management</h3>

      {loading ? (
        <div className="order-list">
          {[...Array(3)].map((_, index) => (
            <OrderSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="order-list">
          {orders && orders.length === 0 ? (
            <NoOrdersMessage />
          ) : (
            orders.slice().reverse().map((order, index) => (
              <div key={index} className="order-item">
                <img src={assetsAdmin.parcel_icon} alt="Parcel Icon" className="parcel-icon" />
                <div className="order-details">
                  <p className="order-item-food">
                    {order.items.map((item, idx) => (
                      <span key={idx}>
                        {item.name} - {item.quantity}
                        {idx !== order.items.length - 1 && ', '}
                      </span>
                    ))}
                  </p>
                  <p className="order-item-name">{order.address.firstName} {order.address.lastName}</p>
                  <div className="order-item-address">
                    <p>{order.address.street}, {order.address.flat}</p>
                    <p>{order.address.floor} {order.address.floor && order.address.landmark ? " ," : ""} {order.address.landmark}</p>
                  </div>
                  <div className="order-item-phone"><div>{order.address.phone}</div> <div className='payment'>Payment Method: <strong>{order.paymentMethod == "COD" ? "Cash on Delivery" : "Online Payment"}</strong></div></div>
                  <button
                    className="direction-button"
                    onClick={() => getDirections(order.address.latitude, order.address.longitude)}
                  >
                    Get Directions
                  </button>
                </div>
                <div className="order-summary">
                  <p><strong>Items:</strong> {order.items.length}</p>
                  <p><strong>Total:</strong> ₹{order.amount}</p>
                  <p><strong>Delivery Charge:</strong> ₹{order.deliveryCharge}</p>
                  <p><strong>Date:</strong> {formatDate(order.date)}</p>
                  <select
                    onChange={(event) => statusHandler(event, order._id)}
                    value={order.status}
                    className="order-status-select"
                  >
                    <option value="Food Processing">Food Processing</option>
                    <option value="Out for delivery">Out for delivery</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!isAtTop && (
        <button className="go-to-top" onClick={scrollToTop}>
          ↑
        </button>
      )}
    </div>
  );
};

export default Orders;