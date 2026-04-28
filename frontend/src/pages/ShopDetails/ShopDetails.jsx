import { useContext, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ShopDetails.css';
import { StoreContext } from '../../context/storeContext';
import FoodDisplay from '../../components/FoodDisplay/FoodDisplay';
import { assetsUser } from '../../assets/assetsUser';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Store } from 'lucide-react';

const ShopDetails = () => {
    const { shopId } = useParams();
    const [shop, setShop] = useState(null);
    const [foodItems, setFoodItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredFoodItems, setFilteredFoodItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shopNotFound, setShopNotFound] = useState(false);
    const { url, fetchShopFoodList, getNumberOfItems, logout } = useContext(StoreContext);
    const [showCartIcon, setShowCartIcon] = useState(false);
    const navigate = useNavigate();
    const searchBarRef = useRef(null);

    const fetchShopDetails = async () => {
        try {
            if (shopId) {
                const response = await axios.get(`${url}/api/shops/${shopId}`);
                //console.log(response.data.data.shop);
                setShop(response.data.data.shop);
                setFoodItems(response.data.data.foodItems);
                setFilteredFoodItems(response.data.data.foodItems);
                setShopNotFound(false);
                setLoading(false);
            }
        } catch (error) {
            if (error.response?.status === 401 && error.response.data.message === 'Token expired') {
                logout();
            } else if (error.response?.status === 404) {
                setShopNotFound(true);
            }
            console.error("Error fetching shop details:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShopDetails();
        fetchShopFoodList(shopId);
    }, [shopId]);

    useEffect(() => {
        const filtered = foodItems.filter((item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredFoodItems(filtered);
    }, [searchQuery, foodItems]);

    useEffect(() => {
        const handleScroll = () => setShowCartIcon(window.scrollY > 80);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSearchFocus = () => {
        if (searchBarRef.current) {
            const offset = 100;
            const elementPosition = searchBarRef.current.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
            });
        }
    };

    const ShopInfoSkeleton = () => (
        <div className="shop-info-container">
            <Skeleton height={300} width={400} className="shop-detail-image" />
            <div className="shop-info">
                <Skeleton height={40} width="70%" />
                <div className="shop-email">
                    <Skeleton height={24} width={24} style={{ marginRight: '10px' }} />
                    <Skeleton height={20} width="200px" />
                </div>
                <div className="shop-address">
                    <Skeleton height={20} width="100%" />
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                        <Skeleton height={24} width={24} style={{ marginRight: '10px' }} />
                        <Skeleton height={20} width="150px" />
                    </div>
                </div>
                <div className="shop-contact">
                    <Skeleton height={24} width={24} style={{ marginRight: '10px' }} />
                    <Skeleton height={20} width="120px" />
                </div>
            </div>
        </div>
    );

    const SearchBarSkeleton = () => (
        <div className="search-bar">
            <Skeleton height={50} width="100%" style={{ borderRadius: '30px' }} />
        </div>
    );

    const FoodItemsSkeleton = () => (
        <div className="food-display-skeleton">
            {[...Array(6)].map((_, index) => (
                <div key={index} className="food-item-skeleton">
                    <Skeleton height={200} width="100%" style={{ borderRadius: '15px' }} />
                    <Skeleton height={20} width="80%" style={{ marginTop: '10px' }} />
                    <Skeleton height={16} width="60%" style={{ marginTop: '5px' }} />
                    <Skeleton height={18} width="40%" style={{ marginTop: '10px' }} />
                </div>
            ))}
        </div>
    );

    const ShopNotFound = () => (
        <div className="shop-not-found">
            <Store size={80} className="shop-not-found-icon" />
            <h2>Shop Not Found</h2>
            <p>Sorry, the shop you're looking for doesn't exist or has been removed.</p>
            <button
                className="go-back-button"
                onClick={() => navigate('/')}
            >
                Go Back to Home
            </button>
        </div>
    );

    if (loading) {
        return (
            <div className="shop-details">
                <ShopInfoSkeleton />
                <SearchBarSkeleton />
                <FoodItemsSkeleton />
            </div>
        );
    }

    if (shopNotFound) {
        return (
            <div className="shop-details">
                <ShopNotFound />
            </div>
        );
    }

    return (
        <div className="shop-details">
            {shop ? (
                <>
                    <div className="shop-info-container">
                        <img
                            src={`${shop.shopImage}`}
                            alt={shop.name}
                            className="shop-detail-image"
                        />
                        <div className="shop-info">
                            <h1>{shop.name}</h1>
                            <div className="shop-address">
                                <p>Address: {shop.shopAddress.address}</p>

                            </div>
                            {shop.shopAddress.latitude && shop.shopAddress.longitude && (
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${shop.shopAddress.latitude},${shop.shopAddress.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <img src={assetsUser.direction} alt="" className="icon-image" />
                                    Get Directions
                                </a>
                            )}
                            <div className="shop-email">
                                <a
                                    href={`mailto:${shop.email}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <img src={assetsUser.email} alt="" className="icon-image" />
                                    Contact via Email
                                </a>
                            </div>
                            <div className="shop-contact">
                                <a href={`tel:${shop.phone}`}>
                                    <img src={assetsUser.phone} alt="" className="icon-image" />
                                    Call Now
                                </a>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`search-bar ${!searchQuery ? 'search-empty' : ''}`}
                        ref={searchBarRef}
                    >
                        <input
                            type="text"
                            placeholder="Search for food items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={handleSearchFocus}
                            className="search-input"
                        />
                        {!searchQuery && (
                            <span
                                style={{
                                    content: '',
                                    position: 'absolute',
                                    width: '20px',
                                    height: '20px',
                                    backgroundImage: `url(${assetsUser.search_icon})`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: 'contain',
                                    right: '20px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    pointerEvents: 'none',
                                }}
                            />
                        )}
                        {searchQuery && (
                            <button
                                className="clear-button"
                                onClick={() => setSearchQuery('')}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {filteredFoodItems.length > 0 ? (
                        <FoodDisplay
                            foodItems={filteredFoodItems}
                            shopId={shopId}
                            isSearching={!!searchQuery}
                        />
                    ) : (
                        <div className="no-food-items">
                            <img
                                src={assetsUser.noresult}
                                alt="No Food Items"
                                className="no-food-image"
                            />
                            <p>No food items match your search.</p>
                            {searchQuery && (
                                <button
                                    className="clear-button-not-found"
                                    onClick={() => setSearchQuery('')}
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <ShopNotFound />
            )}

            {getNumberOfItems() > 0 && showCartIcon && (
                <div className="floating-cart" onClick={() => navigate('/cart')}>
                    <div className="cart-counter">{getNumberOfItems()}</div>
                    <div className="cart-icon">
                        <img src={assetsUser.Cart} alt="Cart" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShopDetails;