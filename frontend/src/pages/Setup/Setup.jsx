import { useState, useContext, useEffect } from "react";
import { StoreContext } from "../../context/storeContext";
import { toast } from "react-hot-toast";
import axios from "axios";
import "./Setup.css";
import { useNavigate } from "react-router-dom";

const Setup = () => {
  const { url, token, logout } = useContext(StoreContext);
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    shopImage: "",
    name: localStorage.getItem("shopName") || "",
    address: "",
    street2: "",
    city: "",
    state: "",
    postal_code: "",
    pan: "",
    email: localStorage.getItem("shopEmail") || "",
    phone: "",
    subscription: "149",
    razorpay_order_id: "",
    razorpay_payment_id: "",
    razorpay_signature: "",
    latitude: "",
    longitude: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
  });

  const [shopImage, setShopImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const onChangeHandler = (e) => {
    const { name, value } = e.target;

    // If address field is manually changed, reset coordinates
    if (name === "address") {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
        latitude: "",
        longitude: "",
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const onImageChangeHandler = (e) => {
    const selectedImage = e.target.files[0];
    if (selectedImage) {
      if (!["image/jpeg", "image/png"].includes(selectedImage.type)) {
        toast.error("Please upload a JPEG or PNG image");
        return;
      }
      if (selectedImage.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setShopImage(selectedImage);

      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(selectedImage);
    }
  };

  const onSubscriptionSelect = (subscription) => {
    setFormData((prevData) => ({ ...prevData, subscription }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1: {
        if (
          !formData.name ||
          !formData.address ||
          !formData.city ||
          !formData.state ||
          !formData.postal_code ||
          !formData.email ||
          !formData.phone
        ) {
          toast.error("Please complete all shop profile fields.");
          return false;
        }
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(formData.phone)) {
          toast.error("Please enter a valid 10-digit phone number.");
          return false;
        }
        if (!formData.latitude || !formData.longitude) {
          toast.error(
            "Please provide location coordinates by entering a valid address."
          );
          return false;
        }
        return true;
      }
      case 2: {
        if (!shopImage) {
          toast.error("Please upload a shop image.");
          return false;
        }
        if (!formData.pan) {
          toast.error("Please enter PAN number.");
          return false;
        }
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(formData.pan)) {
          toast.error("Please enter a valid PAN number (e.g., AAACL1234C).");
          return false;
        }
        if (
          !formData.accountHolderName ||
          !formData.accountNumber ||
          !formData.ifscCode ||
          !formData.bankName
        ) {
          toast.error("Please complete all bank details.");
          return false;
        }
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(formData.ifscCode)) {
          toast.error("Please enter a valid IFSC code (e.g., SBIN0001234).");
          return false;
        }
        return true;
      }
      case 3: {
        if (!termsAccepted) {
          toast.error("You must accept the terms and conditions.");
          return false;
        }
        return true;
      }
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const loadRazorpayScript = async () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const initiatePayment = async () => {
    try {
      const response = await axios.post(`${url}/api/payment/create-order`, {
        amount: formData.subscription * 100,
        token,
      });
      const { order } = response.data;
      return order;
    } catch (error) {
      if (
        error.response?.status === 401 &&
        error.response.data.message === "Token expired"
      ) {
        logout();
      }
      console.error("Error initiating payment:", error);
      toast.error(
        error.response?.data?.message || "Failed to initiate payment."
      );
      throw error;
    }
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (currentStep < 3) {
      nextStep();
      return;
    }

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    const isRazorpayLoaded = await loadRazorpayScript();
    if (!isRazorpayLoaded) {
      toast.error("Failed to load Razorpay. Please try again.");
      return;
    }

    try {
      const order = await initiatePayment();

      const options = {
        key: import.meta.env.VITE_ROZARPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: formData.name,
        description: "Shop Subscription Payment",
        order_id: order.id,
        handler: async function (response) {
          try {
            const formDataToSend = { ...formData };
            formDataToSend.razorpay_order_id = response.razorpay_order_id;
            formDataToSend.razorpay_payment_id = response.razorpay_payment_id;
            formDataToSend.razorpay_signature = response.razorpay_signature;

            if (shopImage) {
              const reader = new FileReader();
              reader.readAsDataURL(shopImage);
              await new Promise((resolve, reject) => {
                reader.onload = () => {
                  formDataToSend.shopImage = reader.result;
                  resolve();
                };
                reader.onerror = reject;
              });
            }

            const verifyResponse = await axios.post(
              `${url}/api/payment/verify`,
              formDataToSend,
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (verifyResponse.data.success) {
              toast.success("Payment successful! Shop setup completed.");
              localStorage.removeItem("shopName");
              localStorage.removeItem("shopEmail");
              navigate("/");
            } else {
              toast.error(
                verifyResponse.data.message || "Payment verification failed."
              );
            }
          } catch (error) {
            console.error("Error verifying payment:", error);
            toast.error(
              error.response?.data?.message ||
              "Payment verification failed. Please contact support."
            );
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: "#3399cc",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("Error during payment process:", error);
      toast.error("Payment process failed.");
    }
  };

  useEffect(() => {
    if (window.google) {
      const input = document.getElementById("shop-address");
      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: "IN" },
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          let formattedAddress = place.formatted_address;
          formattedAddress = formattedAddress
            .replace(/^[A-Z0-9+]+,\s*/, "")
            .trim();
          const addressComponents = place.address_components;
          const getComponent = (type) =>
            addressComponents.find((c) => c.types.includes(type))?.long_name ||
            "";
          setFormData((prevData) => ({
            ...prevData,
            address: formattedAddress,
            street2: getComponent("sublocality") || "N/A",
            city: getComponent("locality") || "Nagpur",
            state: getComponent("administrative_area_level_1") || "MAHARASHTRA",
            postal_code: getComponent("postal_code") || "440001",
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
          }));
          toast.success("Address selected successfully!");
        } else {
          toast.error("Invalid address selected. Please try again.");
        }
      });
    }
  }, []);

  if (!token) {
    return navigate("/");
  }

  return (
    <div className="setup-page">
      <div className="setup-container">
        {/* Step Progress Indicator */}
        <div className="step-progress">
          <div className="step-indicator">
            <div
              className={`step ${currentStep >= 1 ? "active" : ""} ${currentStep > 1 ? "completed" : ""
                }`}
            >
              <span className="step-number">1</span>
              <span className="step-label">Shop Profile</span>
            </div>
            <div className="step-line"></div>
            <div
              className={`step ${currentStep >= 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""
                }`}
            >
              <span className="step-number">2</span>
              <span className="step-label">Documents & Bank</span>
            </div>
            <div className="step-line"></div>
            <div className={`step ${currentStep >= 3 ? "active" : ""}`}>
              <span className="step-number">3</span>
              <span className="step-label">Subscription</span>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmitHandler} className="setup-form">
          {/* Step 1: Shop Profile */}
          {currentStep === 1 && (
            <div className="step-content">
              <h2>Complete Your Shop Profile</h2>
              <div className="form-grid">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={onChangeHandler}
                  placeholder="Shop Name"
                  autoComplete="off"
                  disabled={!!localStorage.getItem("shopName")}
                  required
                />
                <textarea
                  name="address"
                  id="shop-address"
                  value={formData.address}
                  onChange={onChangeHandler}
                  placeholder="Shop Address (e.g., Dhantoli, Nagpur)"
                  rows="4"
                  autoComplete="off"
                  required
                />
                <input
                  type="text"
                  name="street2"
                  value={formData.street2}
                  onChange={onChangeHandler}
                  placeholder="Street 2 (e.g., Landmark)"
                  required
                />
                <div className="form-row">
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={onChangeHandler}
                    placeholder="City"
                    required
                  />
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={onChangeHandler}
                    placeholder="State"
                    required
                  />
                </div>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={onChangeHandler}
                  placeholder="Postal Code"
                  required
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  placeholder="Shop Email"
                  onChange={onChangeHandler}
                  disabled={!!localStorage.getItem("shopEmail")}
                  required
                />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={onChangeHandler}
                  placeholder="Shop Phone (10 digits)"
                  autoComplete="off"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 2: Documents & Bank Details */}
          {currentStep === 2 && (
            <div className="step-content">
              <h2>Upload Documents & Bank Details</h2>
              <div className="form-grid">
                <div className="file-upload-section">
                  <div className="file-input-container">
                    <label className="file-input-label">
                      Upload Shop Image
                    </label>
                    {!imagePreview ? (
                      <>
                        <label
                          htmlFor="file-input"
                          className="file-input-button"
                        >
                          <span className="upload-icon">📷</span>
                          Choose Image
                        </label>
                        <p className="upload-hint">JPEG or PNG, max 5MB</p>
                      </>
                    ) : (
                      <div className="image-preview-container">
                        <img
                          src={imagePreview}
                          alt="Shop Preview"
                          className="image-preview"
                        />
                        <div className="image-actions">
                          <p className="file-name">{shopImage.name}</p>
                          <label
                            htmlFor="file-input"
                            className="change-image-btn"
                          >
                            Change Image
                          </label>
                        </div>
                      </div>
                    )}
                    <input
                      name="shopImage"
                      id="file-input"
                      type="file"
                      accept="image/jpeg,image/png"
                      className="file-input"
                      onChange={onImageChangeHandler}
                    />
                  </div>
                </div>

                <h3>Bank Details</h3>
                <input
                  type="text"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={onChangeHandler}
                  placeholder="Account Holder Name"
                  required
                />

                <div className="form-row">
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={onChangeHandler}
                    placeholder="Account Number"
                    required
                  />

                  <input
                    type="text"
                    name="pan"
                    value={formData.pan}
                    onChange={onChangeHandler}
                    placeholder="PAN Number (e.g., AAACL1234C)"
                    required
                  />
                </div>
                <div className="form-row">
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={onChangeHandler}
                    placeholder="IFSC Code (e.g., SBIN0001234)"
                    required
                  />
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={onChangeHandler}
                    placeholder="Bank Name"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Subscription Plan */}
          {currentStep === 3 && (
            <div className="step-content">
              <h2>Choose Your Membership Plan</h2>
              <p className="subscription-subtitle">
                Select the plan that best fits your business needs
              </p>
              <div className="subscription-section">
                <div className="subscription-cards-setup">
                  <div
                    className={`card ${formData.subscription === "149" ? "selected" : ""
                      } `}
                    onClick={() => onSubscriptionSelect("149")}
                  >
                    <div className="plan-price">
                      <span className="currency">₹</span>
                      <span className="amount">149</span>
                    </div>
                    <div className="plan-duration">1 Month</div>
                  </div>
                  <div
                    className={`card ${formData.subscription === "299" ? "selected" : ""
                      }`}
                    onClick={() => onSubscriptionSelect("299")}
                  >
                    <div className="plan-price">
                      <span className="currency">₹</span>
                      <span className="amount">299</span>
                    </div>
                    <div className="plan-duration">3 Months</div>
                  </div>
                  <div
                    className={`card ${formData.subscription === "599" ? "selected" : ""
                      }`}
                    onClick={() => onSubscriptionSelect("599")}
                  >
                    <div className="plan-price">
                      <span className="currency">₹</span>
                      <span className="amount">599</span>
                    </div>
                    <div className="plan-duration">6 Months</div>
                  </div>
                </div>

                <div className="terms">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={() => setTermsAccepted(!termsAccepted)}
                  />
                  I accept the{" "}
                  <button
                    type="button"
                    className="terms-button"
                    onClick={() => setShowTermsModal(true)}
                  >
                    Terms and Conditions
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="step-navigation">
            {currentStep > 1 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={prevStep}
              >
                Previous
              </button>
            )}
            <button type="submit" className="btn-primary">
              {currentStep === 3 ? "Complete Setup & Pay" : "Next Step"}
            </button>
          </div>
        </form>
      </div>

      {showTermsModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Terms and Conditions</h2>
            <div className="modal-content">
              <p>
                Welcome to Drovo! By using our website, subscribing to our
                services, or making a purchase, you agree to the following terms
                and conditions. Please read them carefully before proceeding.
              </p>
              <br />
              <ul>
                <li>
                  <strong>1. General Overview</strong>
                </li>
                <li>
                  Drovo operates as a subscription-based platform for delivering
                  dairy and essential grocery products. By creating an account,
                  you agree to abide by these terms of use, which may be updated
                  from time to time. Drovo reserves the right to modify or
                  discontinue the service (or any part thereof) with or without
                  notice at any time.
                </li>
                <li>
                  <strong>2. Eligibility</strong>
                </li>
                <li>
                  You must be at least 18 years old to use this platform. Minors
                  may use the platform under parental supervision. By
                  registering, you confirm that all information provided is
                  accurate, complete, and up to date.
                </li>
                <li>
                  <strong>3. Service Subscription</strong>
                </li>
                <li>
                  Our subscription model allows you to customize and schedule
                  recurring orders for milk, dahi (curd), bread, and other
                  essentials. Subscriptions can be managed, paused, or canceled
                  at any time without penalty. Users are free to select
                  quantities and delivery timings that suit their preferences.
                </li>
                <li>
                  <strong>4. Ordering and Delivery</strong>
                </li>
                <ul>
                  <li>
                    <strong>Order Placement:</strong> You can place an order via
                    our website. Drovo ensures user-friendly browsing and
                    selection of products.
                  </li>
                  <li>
                    <strong>Delivery Time:</strong> Once an order is placed, our
                    delivery agents strive to deliver within 10 minutes.
                  </li>
                  <li>
                    <strong>Payment Options:</strong> We currently support Cash
                    on Delivery (COD) and Online Payment via Razorpay. For
                    online payments, 99% of the order amount is transferred to
                    the shopkeeper’s bank account, and 1% is retained as a
                    platform commission.
                  </li>
                  <li>
                    <strong>Order Accuracy:</strong> It is the user’s
                    responsibility to verify the order details before
                    confirming. Errors in order placement or delivery should be
                    reported immediately for resolution.
                  </li>
                </ul>
                <li>
                  <strong>5. Pricing and Availability</strong>
                </li>
                <li>
                  Prices of products are clearly displayed and subject to
                  periodic updates. All products are subject to availability. In
                  case an item is out of stock, Drovo will inform you promptly
                  and may suggest an alternative.
                </li>
                <li>
                  <strong>6. Quality Assurance</strong>
                </li>
                <li>
                  Drovo is committed to delivering fresh and quality dairy
                  products and groceries. If you encounter any issues with
                  product quality, you may contact our customer support within
                  24 hours for resolution.
                </li>
                <li>
                  <strong>7. Cancellation and Refund Policy</strong>
                </li>
                <ul>
                  <li>
                    <strong>Cancellations:</strong> Orders can be canceled
                    before they are dispatched for delivery.
                  </li>
                  <li>
                    <strong>Refunds:</strong> Refunds for canceled orders or
                    unsatisfactory deliveries will be processed within 3–7
                    business days after confirmation.
                  </li>
                </ul>
                <li>
                  <strong>8. User Responsibilities</strong>
                </li>
                <ul>
                  <li>
                    Users must ensure accurate delivery details (e.g., address
                    and contact information).
                  </li>
                  <li>
                    By selecting Cash on Delivery, users commit to making prompt
                    payment upon receiving the order.
                  </li>
                  <li>
                    Repeated refusal of deliveries or non-payment may result in
                    service restrictions.
                  </li>
                </ul>
                <li>
                  <strong>9. Shopkeeper Responsibilities</strong>
                </li>
                <ul>
                  <li>
                    Shopkeepers must provide valid bank account details during
                    setup to receive order payments.
                  </li>
                  <li>
                    Shopkeepers are responsible for fulfilling orders accurately
                    and maintaining product quality.
                  </li>
                  <li>
                    For COD orders, shopkeepers must remit the 1% platform
                    commission to Drovo at the end of the month.
                  </li>
                </ul>
                <li>
                  <strong>10. Limitation of Liability</strong>
                </li>
                <li>
                  Drovo is not responsible for delays caused by unforeseen
                  circumstances (e.g., traffic, weather, or technical issues).
                  Our liability for any claim arising from the service is
                  limited to the price of the product purchased.
                </li>
                <li>
                  <strong>11. Privacy Policy</strong>
                </li>
                <li>
                  User and shopkeeper data, including address, purchase history,
                  and bank details, will be handled in compliance with our
                  Privacy Policy. We are committed to protecting your personal
                  information.
                </li>
                <li>
                  <strong>12. Dispute Resolution</strong>
                </li>
                <li>
                  Any disputes or claims arising from or related to Drovo’s
                  services shall be resolved amicably through customer support.
                  If unresolved, disputes may be subject to local jurisdiction
                  laws.
                </li>
                <li>
                  <strong>13. Amendments</strong>
                </li>
                <li>
                  Drovo reserves the right to update these terms and conditions.
                  Continued use of the service after updates constitutes
                  acceptance of the revised terms.
                </li>
                <li>
                  <strong>14. Commission on Orders</strong>
                </li>
                <li>
                  Drovo charges a 1% commission on all orders (online and COD)
                  placed through the platform. For online payments, 99% of the
                  order amount is transferred directly to the shopkeeper’s bank
                  account via Razorpay Route. For COD orders, shopkeepers must
                  remit the 1% commission to Drovo at the end of each month.
                </li>
              </ul>
            </div>
            <button
              className="close-modal"
              onClick={() => setShowTermsModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Setup;
