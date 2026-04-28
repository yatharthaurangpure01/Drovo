import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FoodItem from '../../components/FoodItem/FoodItem';
import './SeeAll.css';
import { StoreContext } from '../../context/storeContext';
import { assetsUser } from '../../assets/assetsUser';

const SeeAll = () => {
    const location = useLocation();
    const { foodItems, shopId, title } = location.state || { foodItems: [], shopId: '', title: '' };
    const [isAtTop, setIsAtTop] = useState(true);
    const [showCartIcon, setShowCartIcon] = useState(true);
    const navigate = useNavigate();
    const { getNumberOfItems } = useContext(StoreContext);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const handleScroll = () => {
        if (window.scrollY === 0) {
            setIsAtTop(true);
        } else {
            setIsAtTop(false);
        }
    };

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    useEffect(() => {
        const handleScrollCartIcon = () => setShowCartIcon(window.scrollY > 10);
        window.addEventListener('scroll', handleScrollCartIcon);
        return () => window.removeEventListener('scroll', handleScrollCartIcon);
    }, []);

    return (
        <div className="see-all-page">
            {/* Dynamically display the category title */}
            <h1 className="see-all-title">{title || 'All Items'}</h1>
            <div className="see-all-items">
                <div className="food-category-search-results">
                    {foodItems.map((item) => (
                        <FoodItem
                            key={item._id}
                            id={item._id}
                            name={item.name}
                            description={item.description}
                            price={item.price}
                            image={item.image}
                            quantity={item.quantity}
                            unit={item.unit}
                            shopId={shopId}
                        />
                    ))}
                </div>
            </div>

            {!isAtTop && (
                <button className="go-to-top-float" onClick={scrollToTop}>
                    ↑
                </button>
            )}

            {getNumberOfItems() > 0 && showCartIcon && (
                <div className="floating-cart" onClick={() => navigate('/cart')}>
                    <div className="cart-counter">{getNumberOfItems()}</div>
                    <div className="cart-icon">
                        <img src={assetsUser.Cart} alt="Cart" />
                    </div>
                </div>
            )}

            <button className="go-back-button" onClick={() => navigate(-1)}>
                Go Back
            </button>
        </div>
    );
};

export default SeeAll;
