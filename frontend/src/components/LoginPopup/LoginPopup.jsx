import { useState, useContext } from "react";
import "./LoginPopup.css";
import { assetsUser } from "../../assets/assetsUser";
import { StoreContext } from "../../context/storeContext";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";


const LoginPopup = ({ setShowLogin, initialState = "Login", initialRole = "user" }) => {
    const { url, setToken, setUserType } = useContext(StoreContext);
    const [currentState, setCurrentState] = useState(initialState);
    const [otpStep, setOtpStep] = useState(false);
    const [otp, setOtp] = useState("");
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);


    const [data, setData] = useState({
        name: "",
        email: "",
        password: "",
        role: initialRole, 
    });


    const onChangeHandler = (event) => {
        const name = event.target.name;
        const value = event.target.value;
        setData((data) => ({ ...data, [name]: value }));
    };

    const handleTermsClick = (e) => {
        e.preventDefault();
        const url = "/terms-and-conditions";
        window.open(url, "_blank");
    };

    const handleTermsTextClick = () => {
        setTermsAccepted(!termsAccepted);
    };

    const getButtonText = () => {
        if (!isLoading) {
            if (data.role === "shop" && currentState === "Sign Up" && !otpStep) {
                return "Send OTP";
            } else if (otpStep) {
                return "Verify OTP";
            } else {
                return "Submit";
            }
        }

        // Loading states
        if (data.role === "shop" && currentState === "Sign Up" && !otpStep) {
            return "Sending OTP...";
        } else if (otpStep) {
            return "Verifying OTP...";
        } else {
            return "Submitting...";
        }
    };


    const onSendOtp = async (event) => {
        event.preventDefault();

        setIsLoading(true);

        try {
            const response = await axios.post(`${url}/api/send-otp`, { email: data.email, password: data.password });

            if (response.data.success) {
                setOtpStep(true);
                toast.success('OTP sent successfully!');
            } else if (response.data.message) {
                toast.error(response.data.message);
            } else {
                toast.error("Failed to send OTP. Please try again.");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to send OTP. Please try again.';
            toast.error(errorMessage);
            console.error("Error while sending OTP:", error);
        } finally {
            setIsLoading(false);
        }
    };


    const onOtpSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        try {
            const response = await axios.post(`${url}/api/verify-otp`, {
                email: data.email,
                otp,
                name: data.name,
                password: data.password,
            });

            if (response.data.success) {
                localStorage.setItem("shopName", data.name);
                localStorage.setItem("shopEmail", data.email);
                localStorage.setItem("userType", "shop");
                setUserType("shop");
                setToken(response.data.token);
                localStorage.setItem("token", response.data.token);
                navigate("/setup");
                setShowLogin(false);
                toast.success('OTP Verified!');
            } else if (response.data.message) {
                toast.error(response.data.message);
            } else {
                toast.error("Failed to verify OTP. Please try again.");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to verify OTP. Please try again.';
            toast.error(errorMessage);
            console.error("Error during OTP verification:", error);
        }
        finally {
            setIsLoading(false);
        }
    };


    const onGoogleSuccess = async (credentialResponse) => {
        try {
            const userType = data.role;

            const response = await axios.post(`${url}/api/login/google`, {
                token: credentialResponse.credential,
                userType: userType
            });

            if (response.data.success) {
                const { token, isNewUser } = response.data;

                if (isNewUser) {
                    const decodedToken = jwtDecode(credentialResponse.credential);

                    const googleData = {
                        name: decodedToken.name,
                        email: decodedToken.email,
                        role: data.role,
                        password: "",
                    };

                    const signupResponse = await axios.post(`${url}/api/register-google`, googleData);

                    if (signupResponse.data.success) {
                        setToken(signupResponse.data.token);
                        localStorage.setItem("token", signupResponse.data.token);
                        setUserType(userType);
                        localStorage.setItem("userType", userType);

                        if (userType === 'shop') {
                            localStorage.setItem("shopEmail", decodedToken.email);
                            navigate("/setup");
                            toast.success("Shop signup successful via Google!");
                        } else {
                            navigate("/");
                            toast.success("User signup successful via Google!");
                        }

                        setShowLogin(false);
                    } else {
                        toast.error("Google signup failed!");
                    }
                } else {
                    setToken(token);
                    localStorage.setItem("token", token);
                    setUserType(userType);
                    localStorage.setItem("userType", userType);

                    navigate("/");

                    setShowLogin(false);
                }
            } else {
                toast.error(response.data.message || "Google Login Failed!");
            }
        } catch (error) {
            console.error("Error with Google Login:", error);
            toast.error("Google Login Failed!");
        }
    };



    const onLoginOrRegister = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        const newUrl = `${url}/api/${currentState === "Login" ? "login" : "register"}`;

        try {
            const response = await axios.post(newUrl, data);

            if (response.data.success) {
                setToken(response.data.token);
                localStorage.setItem("token", response.data.token);

                const userType = data.role === "shop" && currentState === "Login" ? "shop" : "user";
                localStorage.setItem("userType", userType);
                setUserType(userType);

                navigate("/");
                setShowLogin(false);
                // toast.success(`${userType === "shop" ? "Shop" : "User"} ${currentState} successful!`);
            } else if (response.data.message) {
                toast.error(response.data.message);
            } else {
                toast.error(`An error occurred during ${currentState}`);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred.';
            toast.error(errorMessage);
            console.error("Error during login or registration:", error);
        }
        finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="login-popup">
            <form
                onSubmit={otpStep ? onOtpSubmit : currentState === "Sign Up" && data.role === "shop" ? onSendOtp : onLoginOrRegister}
                className="login-popup-container"
            >
                <div className="login-popup-title">
                    <h2>{currentState}</h2>
                    <img onClick={() => setShowLogin(false)} src={assetsUser.cross_icon} alt="Close" />
                </div>

                <div className="role-tabs">
                    <div className="tab-container">
                        <button
                            type="button"
                            className={`tab-button ${data.role === "user" ? "active" : ""}`}
                            onClick={() => setData(prev => ({ ...prev, role: "user" }))}
                        >
                            <span className="tab-text">User</span>
                        </button>
                        <button
                            type="button"
                            className={`tab-button ${data.role === "shop" ? "active" : ""}`}
                            onClick={() => setData(prev => ({ ...prev, role: "shop" }))}
                        >
                            <span className="tab-text">Shop</span>
                        </button>
                    </div>
                </div>

                <div className="login-popup-input">
                    {currentState === "Sign Up" && (
                        <input
                            type="text"
                            name="name"
                            onChange={onChangeHandler}
                            value={data.name}
                            placeholder={data.role === "user" ? "Your Name" : "Shop Name"}
                            required
                        />
                    )}
                    <input
                        type="email"
                        name="email"
                        onChange={onChangeHandler}
                        value={data.email}
                        placeholder="Your Email"
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        onChange={onChangeHandler}
                        value={data.password}
                        placeholder="Password"
                        required
                    />

                    {data.role === "shop" && currentState === "Sign Up" && otpStep && (
                        <input
                            type="text"
                            name="otp"
                            onChange={(e) => setOtp(e.target.value)}
                            value={otp}
                            placeholder="Enter OTP"
                            required
                        />
                    )}
                </div>

                <div className="login-popup-condition">
                    <input 
                        type="checkbox" 
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        required 
                    />
                    <p onClick={handleTermsTextClick} style={{ cursor: 'pointer' }}>
                        I have read and agree to the{" "}
                        <Link to="#" onClick={handleTermsClick} className="highlighted-link">
                            Terms and Conditions and Privacy Policy
                        </Link>.
                    </p>
                </div>

                <button type="submit" disabled={isLoading}>
                    {getButtonText()}
                </button>


                <div className="separator">
                    <span>OR</span>
                </div>


                <div className="google-login-wrapper">
                    <GoogleLogin
                        onSuccess={onGoogleSuccess}
                        onError={() => toast.error("Google Login Failed!")}
                    />
                </div>


                {currentState === "Sign Up" ? (
                    <p>
                        Already have an account?{" "}
                        <span onClick={() => setCurrentState("Login")}>Login here</span>
                    </p>
                ) : (
                    <p>
                        Create a new account?{" "}
                        <span onClick={() => setCurrentState("Sign Up")}>Click here</span>
                    </p>
                )}
            </form>
        </div>
    );
};

export default LoginPopup;