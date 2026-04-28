import { useContext, useEffect, useState, useRef, useCallback } from "react";
import "./Home.css";
import axios from "axios";
import { Link } from "react-router-dom";
import { StoreContext } from "../../context/storeContext";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { assetsUser } from "../../assets/assetsUser";
import { toast } from "react-hot-toast";
import { MapPin } from "lucide-react";
import StatsAndTestimonials from "../../components/Testimonials/StatsAndTestimonials";
import Loader from "../../components/Loader/Loader";

const Home = ({ setShowLogin }) => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState({
    latitude: null,
    longitude: null,
  });
  const [locationError, setLocationError] = useState("");
  const [address, setAddress] = useState("");
  const { url, logout } = useContext(StoreContext);
  const shopSectionRef = useRef(null);
  const partnerSectionRef = useRef(null);

  const handleHeroImageLoad = () => {
    setHeroImageLoaded(true);
  };

  const fetchShops = useCallback(
    async (latitude, longitude, radius = 10) => {
      try {

        const params =
          latitude && longitude ? { latitude, longitude, radius } : {};

        const response = await axios.get(`${url}/api/shops/all`, { params });
        console.log(response.data.data);
        setShops(response.data.data);

        if (latitude && longitude && response.data.data.length === 0) {
          setLocationError(
            `No shops available within ${radius} km of your location.`
          );
        } else {
          setLocationError("");
        }

      } catch (error) {
        if (error.response && error.response.status === 401) {
          if (error.response.data.message === "Token expired") {
            logout();
          }
        }
        console.error("Error fetching shops:", error);
        setLocationError("Failed to fetch shops. Please try again.");
        // toast.error('Failed to fetch shops. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [url, logout]
  );

  const getCurrentLocation = () => {

    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          localStorage.setItem(
            "Location",
            JSON.stringify({ latitude, longitude })
          );
          convertCoordinatesToAddress(latitude, longitude);
          fetchShops(latitude, longitude);
        },
        (error) => {
          let errorMessage =
            "Unable to access your location. Please enter your address.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Location access denied. Please allow location access or enter your address.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage =
                "Location information unavailable. Please try again or enter your address.";
              break;
            case error.TIMEOUT:
              errorMessage =
                "Location request timed out. Please try again or enter your address.";
              break;
          }
          setLocationError(errorMessage);
          toast.error(errorMessage);
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const errorMessage = "Geolocation is not supported by your browser.";
      setLocationError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const convertCoordinatesToAddress = async (latitude, longitude) => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API
        }`
      );

      if (response.data.status === "OK") {

        let formattedAddress = response.data.results[0].formatted_address;

        // Removing Plus Code (e.g., "43PP+37X, ") from the start of the address
        formattedAddress = formattedAddress
          .replace(/^[A-Z0-9+]+,\s*/, "")
          .trim();

        setAddress(formattedAddress);

      } else {
        const errorMessage = "Unable to fetch address from coordinates.";
        setLocationError(errorMessage);
        toast.error(errorMessage);
      }
    } catch {
      const errorMessage = "Error fetching address. Please try again.";
      setLocationError(errorMessage);
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    // Fetch all shops initially if no location is set

    if (!userLocation.latitude && !userLocation.longitude) {
      const location = JSON.parse(localStorage.getItem("Location"));

      if (location) {
        userLocation.latitude = location.latitude;
        userLocation.longitude = location.longitude;
        convertCoordinatesToAddress(location.latitude, location.longitude);
        fetchShops(location.latitude, location.longitude);
      } else {
        fetchShops();
      }
    }
  }, [fetchShops, userLocation]);

  useEffect(() => {
    if (window.google) {

      const input = document.getElementById("address-autocomplete");
      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        types: ["address"],
        componentRestrictions: { country: "IN" },
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();

        if (place.geometry) {
          const latitude = place.geometry.location.lat();
          const longitude = place.geometry.location.lng();

          let formattedAddress = place.formatted_address;
          // Remove Plus Code from autocomplete address
          formattedAddress = formattedAddress
            .replace(/^[A-Z0-9+]+,\s*/, "")
            .trim();

          setUserLocation({ latitude, longitude });
          localStorage.setItem(
            "Location",
            JSON.stringify({ latitude, longitude })
          );

          setAddress(formattedAddress);
          fetchShops(latitude, longitude);
        } else {
          const errorMessage = "Invalid address selected. Please try again.";
          setLocationError(errorMessage);
          toast.error(errorMessage);
        }
      });
    }
  }, [fetchShops]);

  const scrollToShops = () => {
    shopSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToPartnerSection = () => {
    partnerSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSearch = () => {
    // Check if user has set location
    if (!address && !userLocation.latitude && !userLocation.longitude) {
      // Focus location input if no location is set
      const locationInput = document.getElementById("address-autocomplete");
      if (locationInput) {
        locationInput.focus();
        locationInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      scrollToShops();
    }
  };

  const handleJoinDrovo = () => {
    scrollToPartnerSection();
  };

  return (
    <div>
      <div className="hero-section-new">
        <div className="hero-content">
          <div className="hero-text">
            <h1>
              All Fresh Products Delivered <br />
              <span className="highlight">Quickly & Safely</span> to Your
              Doorstep
            </h1>
            <p>
              Enjoy the goodness of premium-quality dairy, grocery, and bakery
              products, sourced fresh from trusted shops and delivered with care
              to your home.
            </p>
            <div className="location-input">
              <div className="input-container">
                <input
                  id="address-autocomplete"
                  type="text"
                  placeholder="Enter your location (e.g., Dhantoli, Nagpur)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <button
                  className="location-icon-btn"
                  onClick={getCurrentLocation}
                  disabled={loading}
                  title={
                    loading ? "Fetching Location..." : "Get Current Location"
                  }
                >
                  <MapPin size={20} />
                </button>
              </div>
            </div>
            <div className="cta-buttons-container">
              <button className="cta-button primary" onClick={handleSearch}>
                Search
              </button>
              <button
                className="cta-button secondary"
                onClick={handleJoinDrovo}
              >
                Become a Partner
              </button>
            </div>
          </div>
          <div className="hero-image">
            {!heroImageLoaded && <Loader />}
            <img
              src={assetsUser.deliveryBoy}
              alt="Food Delivery"
              onLoad={handleHeroImageLoad}
            />
          </div>
        </div>
      </div>

      <div className="shop-list" ref={shopSectionRef}>
        <h1>Shops Near You</h1>
        {locationError && <p className="error-message">{locationError}</p>}
        <div className="shop-grid">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="shop-card">
                <Skeleton height={200} />
                <div className="shop-info-home">
                  <Skeleton height={20} width="60%" />
                  <Skeleton height={15} width="80%" />
                </div>
              </div>
            ))
          ) : // userLocation.latitude && userLocation.longitude ? (
            shops.length > 0 ? (
              shops.map((shop) => (
                <Link
                  to={`/shop/${shop._id}`}
                  key={shop._id}
                  className="shop-card"
                >
                  <div className="shop-card-content">
                    <img
                      src={shop.shopImage}
                      alt={shop.name}
                      className="shop-image-home"
                    />
                    <div className="shop-info-home">
                      <h2>{shop.name}</h2>
                      <p>
                        {shop.shopAddress.address}, {shop.shopAddress.city}
                      </p>
                      {shop.distance && (
                        <p>
                          <b>
                            {(shop.distance || 0).toFixed(2) == 0.0
                              ? 0
                              : (shop.distance || 0).toFixed(2)}{" "}
                            km away
                          </b>
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              // ) : (
              //     <p className="no-shops-message">No shops available near your location.</p>
              // )
              <p className="select-city-message">
                Please select your location to see nearby shops.
              </p>
            )}
        </div>
      </div>

      <div className="features-section">
        <h2>Why Choose Drovo?</h2>
        <div className="features-grid">
          <div className="feature">
            <img src={assetsUser.fresh} alt="Fresh Products" />
            <h3>Fresh Products</h3>
            <p>
              We deliver fresh dairy, grocery, and bakery products straight to
              your door.
            </p>
          </div>
          <div className="feature">
            <img src={assetsUser.quick} alt="Quick Delivery" />
            <h3>Quick Delivery</h3>
            <p>Timely and reliable delivery to ensure your satisfaction.</p>
          </div>
          <div className="feature">
            <img src={assetsUser.securepayment} alt="Secure Payments" />
            <h3>Secure Payment</h3>
            <p>Multiple payment options with secure processing.</p>
          </div>
          <div className="feature">
            <img src={assetsUser.allsupport} alt="24/7 Support" />
            <h3>24/7 Support</h3>
            <p>
              Our customer support team is available 24/7 to assist you with any
              issues.
            </p>
          </div>
        </div>
      </div>


      <StatsAndTestimonials />

      <section className="partner-section" ref={partnerSectionRef}>
        <div className="partner-container">
          <div className="partner-content">
            <div className="partner-text">
              <h2>Partner with Drovo</h2>
              <p>
                Join thousands of restaurants growing their business with Drovo
              </p>
              <ul className="partner-benefits">
                <li>Reach more customers in your area</li>
                <li>Increase revenue with online orders</li>
                <li>Easy-to-use restaurant dashboard</li>
                <li>Dedicated marketing support</li>
              </ul>
              <button className="partner-cta-btn" onClick={() => {
                window.scrollTo({ top: 0, behavior: 'instant' }); // Explicitly set behavior to auto (no animation)
                setShowLogin(true, "Sign Up", "shop");
              }}>Become a Partner</button>
            </div>
            <div className="partner-visual">
              <div className="partner-image-placeholder">
                <img
                  src={assetsUser.restaurant_partner}
                  alt="Partner with Drovo"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;