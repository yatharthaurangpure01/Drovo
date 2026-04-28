import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PlaceOrder.css";
import { StoreContext } from "../../context/storeContext";
import axios from "axios";
import { toast } from "react-hot-toast";
import Loader from "../../components/Loader/Loader";
import { Locate } from 'lucide-react';

const PlaceOrder = () => {
  const { getTotalCartAmount, token, food_list, cartItems, url, shopId, setCartItems, logout } = useContext(StoreContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    street: "",
    latitude: "",
    longitude: "",
    flat: "",
    floor: "",
    landmark: "",
  });
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [isAddressFilled, setIsAddressFilled] = useState(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  const convertCoordinatesToAddress = (latitude, longitude) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const latLng = new window.google.maps.LatLng(latitude, longitude);

      geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === "OK" && results[0]) {
          let address = results[0].formatted_address;
          // Remove Plus Code (e.g., "43PP+37X, ") from the address
          address = address.replace(/^[A-Z0-9+]+,\s*/, '').trim();
          setData((prevData) => ({ ...prevData, street: address, latitude, longitude }));
          setAddressError("");
          setIsAddressFilled(true);
          toast.success("Location fetched successfully!");
          setAddressError("If Address seems incorrect, please use autocomplete to fix it.");
        } else {
          setAddressError("Unable to fetch address. Please try again.");
          toast.error("Unable to fetch address. Please try again.");
        }
      });
    } catch (error) {
      console.error("Error converting coordinates to address:", error);
      setAddressError("Something went wrong while fetching the address.");
      toast.error("Something went wrong!");
    }
  };

  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setData((prevData) => ({
      ...prevData,
      [name]: value,
      ...(name === "street" ? { latitude: "", longitude: "" } : {}),
    }));
    if (name === "street") {
      setIsAddressFilled(!!value);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setData((prevData) => ({ ...prevData, latitude, longitude }));
          setIsAddressFilled(true);
          convertCoordinatesToAddress(latitude, longitude);
        },
        () => {
          setAddressError("Unable to access location. Please enable location services or use autocomplete.");
          toast.error("Unable to access location. Please enable location services.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setAddressError("Geolocation is not supported by this browser.");
      toast.error("Geolocation is not supported by this browser.");
    }
  };

  useEffect(() => {
    if (Object.keys(cartItems).length === 0 || getTotalCartAmount() === 0) {
      return navigate("/");
    }

    const storedLocation = JSON.parse(localStorage.getItem("Location"));
    if (storedLocation && storedLocation.latitude && storedLocation.longitude) {
      setData((prev) => ({
        ...prev,
        latitude: storedLocation.latitude,
        longitude: storedLocation.longitude,
      }));
      convertCoordinatesToAddress(storedLocation.latitude, storedLocation.longitude);
    }

    if (window.google) {
      const input = document.getElementById("street-address");
      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        types: ["address"],
        componentRestrictions: { country: "IN" },
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          const latitude = place.geometry.location.lat();
          const longitude = place.geometry.location.lng();
          let address = place.formatted_address || "";

          // Remove Plus Code from autocomplete address
          address = address.replace(/^[A-Z0-9+]+,\s*/, '').trim();
          setData((prevData) => ({
            ...prevData,
            street: address,
            latitude,
            longitude,
          }));
          setAddressError("");
          setIsAddressFilled(true);
          toast.success("Address selected successfully!");
        } else {
          setAddressError("Invalid address selected. Please try again.");
          toast.error("Invalid address selected. Please try again.");
        }
      });
    }
  }, [cartItems, getTotalCartAmount, navigate]);

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^[789]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const isFormValid = () => {
    const { firstName, lastName, phone, street, flat, latitude, longitude } = data;
    return firstName && lastName && phone && street && latitude && longitude && flat;
  };

  useEffect(() => {
    const fetchDistanceAndCharge = async () => {
      if (shopId && data.latitude && data.longitude) {
        const shopCoordinates = await axios
          .get(`${url}/api/shops/${shopId}`, { headers: { token } })
          .then((res) => res.data.data.coordinates)
          .catch((err) => {
            toast.error("Unable to fetch shop location.");
            return null;
          });

        if (!shopCoordinates) return;

        setIsCalculatingDistance(true);

        const customerCoordinates = {
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude),
        };

        const service = new window.google.maps.DistanceMatrixService();
        const request = {
          origins: [new window.google.maps.LatLng(customerCoordinates.lat, customerCoordinates.lng)],
          destinations: [new window.google.maps.LatLng(shopCoordinates.lat, shopCoordinates.lng)],
          travelMode: window.google.maps.TravelMode.DRIVING,
        };

        service.getDistanceMatrix(request, (response, status) => {
          if (status === "OK") {
            const distance = response.rows[0].elements[0].distance.value;
            const calculatedCharge = calculateDeliveryCharge(distance);
            setDeliveryCharge(calculatedCharge);
            setIsCalculatingDistance(false);
          } else {
            toast.error("Unable to calculate distance. Please try again.");
            setIsCalculatingDistance(false);
          }
        });

        const calculateDeliveryCharge = (distance) => {
          const distanceInKm = distance / 1000;
          if (distanceInKm < 1) return 9;
          if (distanceInKm < 2.5) return 15;
          if (distanceInKm < 4) return 25;
          if (distanceInKm < 6) return 35;
          return 50;
        };
      }
    };

    if (data.latitude && data.longitude) {
      fetchDistanceAndCharge();
    }
  }, [data.latitude, data.longitude, shopId, token, url]);

  const loadRazorpayScript = async () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const initiatePayment = async () => {
    try {
      const response = await axios.post(`${url}/api/order/create-order`, {
        amount: getTotalCartAmount(),
        deliveryCharge,
        token,
        shopId
      }, { headers: { token } });

      const { order } = response.data;
      // console.log("order", order);
      return order;
    } catch (error) {
      if (error.response?.status === 401 && error.response.data.message === 'Token expired') {
        logout();
      }
      toast.error("Failed to initiate payment.");
      throw error;
    }
  };

  const placeOrder = async (event) => {
    event.preventDefault();

    if (!data.latitude || !data.longitude || !data.street || deliveryCharge === 0) {
      toast.error("Please provide a valid address using 'Current Location' or the autocomplete search");
      return;
    }

    if (!isFormValid()) {
      toast.error("Please complete all fields before submitting.");
      return;
    }

    if (!validatePhoneNumber(data.phone)) {
      toast.error("Invalid Phone Number");
      return;
    }

    setIsLoading(true);

    const orderData = {
      address: data,
      items: food_list
        .filter((item) => cartItems[shopId]?.[item._id] > 0)
        .map((item) => {
          const baseQuantity = cartItems[shopId][item._id] * item.quantity;
          let dynamicQuantity = baseQuantity;
          let dynamicUnit = item.unit;

          if (item.unit === 'grams' && baseQuantity >= 1000) {
            dynamicQuantity = (baseQuantity / 1000).toFixed(2);
            dynamicUnit = 'kg';
          } else if (item.unit === 'ml' && baseQuantity >= 1000) {
            dynamicQuantity = (baseQuantity / 1000).toFixed(2);
            dynamicUnit = 'liter';
          }

          // "5 liters" instead of "5.0 liters"
          const formattedQuantity = parseFloat(dynamicQuantity) % 1 === 0
            ? parseInt(dynamicQuantity, 10)
            : dynamicQuantity;

          return {
            ...item,
            quantity: `${formattedQuantity} ${dynamicUnit}`,
          };
        }),
      amount: getTotalCartAmount(),
      deliveryCharge,
      shopId,
    };

    try {
      if (paymentMethod === "COD") {
        setIsLoading(true);
        await axios
          .post(`${url}/api/order/place`, orderData, { headers: { token } })
          .then((res) => {
            toast.success("Order placed successfully!");
            navigate("/myorders");
            setCartItems({});
          })
          .catch((error) => {
            if (error.response?.status === 401 && error.response.data.message === 'Token expired') {
              logout();
            }
            toast.error("Failed to place order. Please try again.");
          })
          .finally(() => setIsLoading(false));

      } else {
        const isRazorpayLoaded = await loadRazorpayScript();
        if (!isRazorpayLoaded) {
          toast.error("Failed to load Razorpay. Please try again.");
          setIsLoading(false);
          return;
        }

        const order = await initiatePayment();

        const options = {
          key: import.meta.env.VITE_ROZARPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          name: "Drovo",
          description: "Order Payment",
          order_id: order.id,
          handler: async function (response) {
            try {
              setIsLoading(true);
              const verifyResponse = await axios.post(
                `${url}/api/order/verify`,
                {
                  ...orderData,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
                { headers: { token } }
              );

              if (verifyResponse.data.success) {
                toast.success("Order placed successfully!");
                navigate("/myorders");
                setCartItems({});
              } else {
                toast.error("Payment verification failed.");
              }
            } catch (error) {
              console.error("Error verifying payment:", error);
              toast.error("Payment verification failed. Please contact support.");
            }
            finally {
              setIsLoading(false);
            }
          },
          prefill: {
            name: `${data.firstName} ${data.lastName}`,
            contact: data.phone,
          },
          theme: {
            color: '#3399cc',
          },
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
      }
    } catch (error) {
      console.error("Error during order process:", error);
      toast.error("Order process failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {isLoading && <Loader />}
      <form
        className="place-order"
        onSubmit={placeOrder}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
          }
        }}
        autoComplete="off"
      >
        <div className="place-order-left">
          <p className="title">Delivery Information</p>
          <div className="multi-field">
            <input
              required
              name="firstName"
              onChange={onChangeHandler}
              value={data.firstName}
              type="text"
              placeholder="First Name"
              autoComplete="off"
            />
            <input
              required
              name="lastName"
              onChange={onChangeHandler}
              value={data.lastName}
              type="text"
              placeholder="Last Name"
              autoComplete="off"
            />
          </div>

          <button type="button" onClick={getCurrentLocation} className="current-location-btn">
            Use Current Location
            {/* <img src={assetsUser.location} alt="" className="button-icon" /> */}
            <Locate />
          </button>
          <p className="or-separator">OR</p>

          {addressError && <p className="error-message">{addressError}</p>}
          <textarea
            id="street-address"
            required
            name="street"
            onChange={onChangeHandler}
            value={data.street}
            autoComplete="off"
            placeholder="Select nearby location (e.g., Dhantoli, Nagpur)"
            rows="2"
          ></textarea>

          {isAddressFilled && (
            <>
              <input
                name="flat"
                onChange={onChangeHandler}
                value={data.flat}
                type="text"
                autoComplete="off"
                placeholder="Flat / House no / Building name *"
                required
              />
              <div className="multi-field">
                <input
                  name="floor"
                  onChange={onChangeHandler}
                  value={data.floor}
                  autoComplete="off"
                  type="text"
                  placeholder="Floor (optional)"
                />
                <input
                  required
                  name="phone"
                  onChange={onChangeHandler}
                  value={data.phone}
                  autoComplete="off"
                  type="text"
                  placeholder="Phone"
                />
              </div>
              <input
                name="landmark"
                onChange={onChangeHandler}
                value={data.landmark}
                autoComplete="off"
                type="text"
                placeholder="Nearby landmark (optional)"
              />
            </>
          )}
        </div>

        <div className="place-order-right">
          <div className="payment-method">
            <p>Payment Method</p>
            <div className="payment-buttons">
              <button
                type="button"
                className={`payment-btn ${paymentMethod === "COD" ? "active" : ""}`}
                onClick={() => setPaymentMethod("COD")}
              >
                <span className="payment-icon">💵</span>
                <div className="payment-text">
                  <span className="payment-title">Cash on Delivery</span>
                  <span className="payment-subtitle">Pay when you receive</span>
                </div>
              </button>

              <button
                type="button"
                className={`payment-btn ${paymentMethod === "Online" ? "active" : ""}`}
                onClick={() => setPaymentMethod("Online")}
              >
                <span className="payment-icon">💳</span>
                <div className="payment-text">
                  <span className="payment-title">Online Payment</span>
                  <span className="payment-subtitle">Pay now securely</span>
                </div>
              </button>
            </div>
          </div>
          <div className="cart-total-final">
            <h2>Cart Total</h2>
            <div>
              <div className="cart-total-details-final">
                <p>Subtotal</p>
                <p>₹{getTotalCartAmount()}</p>
              </div>
              <hr />
              {isCalculatingDistance ? (
                <p>Calculating delivery fee...</p>
              ) : (
                <>
                  <div className="cart-total-details-final">
                    <p>Delivery Fee</p>
                    <p>₹{deliveryCharge}</p>
                  </div>
                  <hr />
                </>
              )}
              <div className="cart-total-details-final">
                <b>Total</b>
                <b>₹{getTotalCartAmount() + deliveryCharge}</b>
              </div>
              <button type="submit" disabled={isLoading}>
                {paymentMethod === "COD" ? "Confirm Order" : "Proceed to payment"}
              </button>

              <div className="cancellation-policy">
                <p><strong>Cancellation Policy:</strong> Orders cannot be cancelled once packed for delivery. In case of unexpected delays, a refund will be provided, if applicable.</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PlaceOrder;