import { useContext, useState } from "react";
import { Route, Routes } from "react-router-dom";
import NavbarUser from "./components/NavbarUser/NavbarUser";
import NavbarAdmin from "./components/NavbarAdmin/NavbarAdmin";
import Sidebar from "../src/components/sidebar/Sidebar";
import Home from "./pages/Home/Home";
import PlaceOrder from "./pages/PlaceOrder/PlaceOrder";
import Cart from "./pages/Cart/Cart";
import Footer from "./components/Footer/Footer";
import LoginPopup from "./components/LoginPopup/LoginPopup";
import MyOrders from "./pages/MyOrders/MyOrders";
import Verify from "./pages/Verify/Verify";
import "react-toastify/dist/ReactToastify.css";
import { Toaster } from "react-hot-toast";
import Setup from "./pages/Setup/Setup";
import Dashboard from "./pages/Dashboard/Dashboard";
import Add from "../src/pages/Add/Add";
import List from "../src/pages/List/List";
import Orders from "../src/pages/Orders/Orders";
import { StoreContext } from "./context/storeContext";
import ShopDetails from "./pages/ShopDetails/ShopDetails";
import RenewSubscription from "./pages/RenewSubscription/RenewSubscription";
import NotFound from "./components/NotFound/NotFound";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";
import TermsAndConditions from "./pages/TermsAndConditions/TermsAndConditions";
import OrderDetails from "./pages/OrderDetails/OrderDetails";
import EditPage from "./pages/EditPage/EditPage";
import SeeAll from "./pages/SeeAll/SeeAll";

const App = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [loginInitialState, setLoginInitialState] = useState("Login");
  const [loginInitialRole, setLoginInitialRole] = useState("user");

  const handleShowLogin = (show, initialState = "Login", initialRole = "user") => {
    setShowLogin(show);
    setLoginInitialState(initialState);
    setLoginInitialRole(initialRole);
  };

  const { userType, url } = useContext(StoreContext);

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />

      <ScrollToTop />

      {showLogin && <LoginPopup setShowLogin={setShowLogin} initialState={loginInitialState} initialRole={loginInitialRole} />}
      <div className={`app-${userType}`}>
        {userType === "user" ? (
          <>
            <NavbarUser setShowLogin={handleShowLogin} />
            <Routes>
              <Route path="/" element={<Home setShowLogin={handleShowLogin} />} />
              <Route
                path="/cart"
                element={<Cart setShowLogin={handleShowLogin} />}
              />
              <Route path="/placeorder" element={<PlaceOrder />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/myorders" element={<MyOrders />} />
              <Route path="/myorders/:id" element={<OrderDetails />} />
              <Route path="/shop/:shopId" element={<ShopDetails />} />
              <Route
                path="/terms-and-conditions"
                element={<TermsAndConditions />}
              />
              <Route path="/category/:category" element={<SeeAll />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </>
        ) : (
          <>
            <Routes>
              <Route
                path="/setup"
                element={
                  <>
                    <div className="app-user">
                      <NavbarUser setShowLogin={handleShowLogin} />
                    </div>
                    <Setup />
                  </>
                }
              />
              <Route
                path="*"
                element={
                  <>
                    <NavbarAdmin />
                    <hr />
                    <div className="app-content">
                      <Sidebar />
                      <Routes>
                        <Route
                          path="/renew-subscription"
                          element={<RenewSubscription />}
                        />
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/dashboard/add" element={<Add />} />
                        <Route
                          path="/dashboard/list"
                          element={<List url={url} />}
                        />
                        <Route
                          path="/dashboard/orders"
                          element={<Orders url={url} />}
                        />
                        <Route
                          path="/dashboard/edit/:id"
                          element={<EditPage url={url} />}
                        />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </div>
                  </>
                }
              />
            </Routes>
          </>
        )}
      </div>

      <Footer />
    </>
  );
};

export default App;
