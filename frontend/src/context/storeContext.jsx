import axios from "axios";
import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const StoreContext = createContext(null);

export const StoreContextProvider = (props) => {

    const [cartItems, setCartItems] = useState({});  // { shopId: { itemId: quantity, ... }, ... }
    const [shopId, setShopId] = useState(null);

    const url = import.meta.env.VITE_BASE_URL;

    const [token, setToken] = useState("");
    const [food_list, setFoodList] = useState([]);
    const [userType, setUserType] = useState("user");
    let navigate = useNavigate();

    const addToCart = (itemId, currentShopId) => {
        setCartItems((prev) => {
            const shopCart = prev[currentShopId] || {};

            const updatedCart = { ...shopCart };
            if (!updatedCart[itemId]) {
                updatedCart[itemId] = 1;
            } else {
                updatedCart[itemId] += 1;
            }

            return { ...prev, [currentShopId]: updatedCart };
        });

        // If logged in, save cart to the server
        // if (token) {
        //     await axios.post(url + "/api/cart/add", { itemId, shopId: currentShopId }, { headers: { token } });
        // }
    };

    const removeFromCart = async (itemId, currentShopId) => {
        setCartItems((prev) => {
            const shopCart = { ...prev[currentShopId] };
            if (shopCart[itemId] > 1) {
                shopCart[itemId] -= 1;
            } else {
                delete shopCart[itemId];
            }
            return { ...prev, [currentShopId]: shopCart };
        });

        // If logged in, update the cart on the server
        // if (token) {
        //     await axios.post(url + "/api/cart/remove", { itemId, shopId: currentShopId }, { headers: { token } });
        // }
    };

    const deleteFromCart = (itemId, shopId) => {
        const updatedCartItems = { ...cartItems };

        if (updatedCartItems[shopId]) {
            delete updatedCartItems[shopId][itemId];
        }

        setCartItems(updatedCartItems);
    };

    const getNumberOfItems = () => {
        let distinctItemCount = 0;
        const shopCart = cartItems[shopId] || {};

        for (const item in shopCart) {
            if (shopCart[item] > 0) {
                distinctItemCount += 1;
            }
        }

        return distinctItemCount;
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.setItem('userType', 'user');
        setUserType('user');
        setToken("");
        navigate("/");
        // toast.success("Logout")
    }


    const fetchShopFoodList = async (shopId) => {
        try {
            if (shopId) {
                const response = await axios.get(`${url}/api/food/list/${shopId}`, { headers: { token } });
                setFoodList(response.data.data);
                setShopId(shopId);
            }
        } catch (error) {
            if (error.response?.data?.redirect) {
                navigate(error.response.data.redirect);
                return error.response.data.message || "Please complete your setup or renew your subscription.";
            }
            console.error("Error fetching food list for shop:", error);
        }
    };

    const getTotalCartAmount = () => {
        let totalAmount = 0;
        const shopCart = cartItems[shopId] || {};

        for (const item in shopCart) {
            if (shopCart[item] > 0) {
                let itemInfo = food_list.find((product) => product._id === item);
                if (itemInfo) totalAmount += itemInfo.price * shopCart[item];
            }
        }

        return totalAmount;
    };

    useEffect(() => {
        async function loadData() {
            if (localStorage.getItem('userType')) setUserType(localStorage.getItem('userType'));

            const savedToken = localStorage.getItem("token");
            if (savedToken) {
                setToken(savedToken);
            }
        }
        loadData();
    }, []);

    useEffect(() => {
        fetchShopFoodList(shopId);
    }, [shopId]);

    const contextValue = {
        food_list,
        cartItems,
        setCartItems,
        addToCart,
        removeFromCart,
        url,
        token,
        setToken,
        userType,
        setUserType,
        fetchShopFoodList,
        shopId,
        setShopId,
        getTotalCartAmount,
        deleteFromCart,
        getNumberOfItems,
        logout
    };

    return <StoreContext.Provider value={contextValue}>{props.children}</StoreContext.Provider>;
};
