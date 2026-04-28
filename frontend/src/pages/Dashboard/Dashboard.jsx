import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { StoreContext } from '../../context/storeContext';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const Dashboard = () => {
  const [shopData, setShopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalItems: 0,
    pendingOrders: 0,
    totalRevenue: 0
  });
  const { url, logout } = useContext(StoreContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        let token = localStorage.getItem('token');
        if (!token) {
          navigate('/logout');
          return;
        }

        const response = await axios.get(`${url}/api/shops/details`, {
          headers: { token },
        });

        if (response.data.success) {
          setShopData(response.data.shop);
          setLoading(false);
        } else {
          toast.error(response.data.message || 'Failed to fetch shop data');
          setLoading(false);
        }
      } catch (error) {
        setLoading(false);

        if (error.response && error.response.status === 401) {
          if (error.response.data.message === 'Token expired') {
            logout();
          }
        }

        if (error.response?.data?.redirect) {
          navigate(error.response.data.redirect);
          return toast.error(error.response.data.message || "Please complete your setup or renew your subscription.");
        }

        toast.error('An error occurred while fetching shop details');
        console.error('Error fetching shop data:', error);
      }
    };

    const fetchStats = async () => {
      try {
        let token = localStorage.getItem('token');
        if (!token) return;

        const ordersResponse = await axios.post(`${url}/api/order/userorders`, {}, {
          headers: { token }
        });

        if (ordersResponse.data.success) {
          const orders = ordersResponse.data.data;
          const totalRevenue = orders.reduce((sum, order) =>
            order.status === "Delivered" ? sum + order.amount : sum, 0
          );
          const pendingOrders = orders.filter(order =>
            order.status === "Food Processing" || order.status === "Out for delivery"
          ).length;

          setStats(prev => ({
            ...prev,
            totalOrders: orders.length,
            totalRevenue,
            pendingOrders
          }));
        }

        const foodResponse = await axios.get(`${url}/api/food/list`);
        if (foodResponse.data.success) {
          setStats(prev => ({
            ...prev,
            totalItems: foodResponse.data.data.length
          }));
        }

      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchShopData();
    fetchStats();
  }, [url, navigate, logout]);

  const DashboardHeaderSkeleton = () => (
    <div className="dashboard-header">
      <Skeleton height={32} width="250px" />
      <Skeleton height={16} width="180px" style={{ marginTop: '8px' }} />
    </div>
  );

  const StatsGridSkeleton = () => (
    <div className="stats-grid">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="stat-card">
          <Skeleton height={32} width="60px" style={{ marginBottom: '8px' }} />
          <Skeleton height={14} width="80px" />
        </div>
      ))}
    </div>
  );

  const ShopInfoSkeleton = () => (
    <div className="shop-info">
      <Skeleton height={20} width="150px" style={{ marginBottom: '20px' }} />
      <div className="info-grid">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="info-item">
            <Skeleton height={16} width="100%" />
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard">
        <DashboardHeaderSkeleton />
        <StatsGridSkeleton />
        <ShopInfoSkeleton />
      </div>
    );
  }

  if (!shopData) {
    return <div>No data available</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p>Welcome back, {shopData.name}!</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.totalOrders}</div>
          <div className="stat-label">Total Orders</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{stats.totalItems}</div>
          <div className="stat-label">Menu Items</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{stats.pendingOrders}</div>
          <div className="stat-label">Pending Orders</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">₹{stats.totalRevenue.toLocaleString()}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
      </div>

      {/* Shop Information */}
      <div className="shop-info">
        <h3>Shop Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <strong>Name:</strong> {shopData.name}
          </div>
          <div className="info-item">
            <strong>Email:</strong> {shopData.email}
          </div>
          <div className="info-item">
            <strong>Phone:</strong> {shopData.phone || 'N/A'}
          </div>
          <div className="info-item">
            <strong>Address:</strong> {shopData.shopAddress.address}
          </div>
          <div className="info-item">
            <strong>Subscription:</strong> {shopData.subscription}
          </div>
          <div className="info-item">
            <strong>Expires:</strong> {new Date(shopData.subEndDate).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;