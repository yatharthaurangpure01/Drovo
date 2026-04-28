import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import './RenewSubscription.css';
import { StoreContext } from "../../context/storeContext";

const RenewSubscription = () => {
    const { url, token, logout } = useContext(StoreContext);
    const navigate = useNavigate();

    const [selectedPlan, setSelectedPlan] = useState('99');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [isScriptLoading, setIsScriptLoading] = useState(false);

    const subscriptionPlans = [
        { price: '99', duration: '15 Days' },
        { price: '149', duration: '1 Month' },
        { price: '299', duration: '3 Months' },
        { price: '599', duration: '6 Months' },
    ];

    const loadRazorpayScript = async () => {
        setIsScriptLoading(true);
        const result = await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
        setIsScriptLoading(false);
        return result;
    };

    const initiatePayment = async () => {
        if (!selectedPlan) {
            toast.error("Please select a subscription plan.");
            return;
        }

        try {
            setIsProcessingPayment(true);

            const response = await axios.post(`${url}/api/payment/createRenewalOrder`, {
                amount: selectedPlan,
                token,
            });

            const { order } = response.data;

            const isRazorpayLoaded = await loadRazorpayScript();
            if (!isRazorpayLoaded) {
                toast.error("Failed to load Razorpay. Please try again.");
                setIsProcessingPayment(false);
                return;
            }

            const options = {
                key: import.meta.env.VITE_ROZAPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Shop Subscription Renewal",
                description: "Renew your subscription",
                order_id: order.id,
                handler: async function (response) {
                    try {
                        verifyPayment(response);
                    } catch (error) {
                        console.error("Error during payment verification:", error);
                        toast.error("Payment verification failed.");
                    }
                },
                prefill: {
                    email: localStorage.getItem('shopEmail') || 'yatharthaurangpure27@gmail.com',
                },
                theme: {
                    color: "#3399cc",
                },
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
        } catch (error) {
            if (error.response && error.response.status === 401) {
                if (error.response.data.message === 'Token expired') {
                    logout();
                }
            }
            console.error("Error during payment process:", error);
            toast.error("Failed to initiate payment. Please try again.");
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const verifyPayment = async (response) => {
        try {
            const verificationResponse = await axios.post(`${url}/api/payment/verifyRenewalPayment`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                subscription: selectedPlan,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (verificationResponse.data.success) {
                toast.success("Subscription renewed successfully!");
                navigate('/');
            } else {
                toast.error("Payment verification failed.");
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                if (error.response.data.message === 'Token expired') {
                    logout();
                }
            }
            console.error("Error verifying payment:", error);
            toast.error("Payment verification failed.");
        }
    };


    return (
        <div className="renew-subscription-page">
            <h2>Your subscription has expired.</h2>
            <p>Please renew your subscription to continue using the dashboard.</p>

            <div className="subscription-cards">
                {subscriptionPlans.map((plan) => (
                    <div
                        key={plan.price}
                        className={`card ${selectedPlan === plan.price ? 'selected' : ''}`}
                        onClick={() => setSelectedPlan(plan.price)}
                        onKeyPress={(e) => e.key === "Enter" && setSelectedPlan(plan.price)}
                        role="button"
                        tabIndex={0}
                        aria-selected={selectedPlan === plan.price}
                    >
                        <h4>₹{plan.price}</h4>
                        <p>{plan.duration}</p>
                    </div>
                ))}
            </div>

            {isScriptLoading && <p>Loading payment gateway...</p>}

            <button
                onClick={initiatePayment}
                disabled={isProcessingPayment}
                className={`renew-button ${isProcessingPayment ? 'disabled' : ''}`}
            >
                {isProcessingPayment ? "Processing..." : "Renew Now"}
            </button>
        </div>
    );
};

export default RenewSubscription;
