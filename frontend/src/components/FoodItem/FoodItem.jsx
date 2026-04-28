import React, { useContext } from 'react';
import './FoodItem.css';
import { assetsUser } from '../../assets/assetsUser';
import { StoreContext } from '../../context/storeContext';

const FoodItem = ({ id, name, price, description, image, shopId, quantity, unit }) => {
    const { cartItems, addToCart, removeFromCart } = useContext(StoreContext);

    const itemQuantity = cartItems[shopId]?.[id] || 0;

    const calculateDynamicQuantity = () => {
        const totalQuantity = itemQuantity * quantity;
        let dynamicQuantity = totalQuantity;
        let dynamicUnit = unit;

        if (unit === 'grams' && totalQuantity >= 1000) {
            dynamicQuantity = (totalQuantity / 1000).toFixed(2);
            dynamicUnit = 'kg';
        } else if (unit === 'ml' && totalQuantity >= 1000) {
            dynamicQuantity = (totalQuantity / 1000).toFixed(2);
            dynamicUnit = 'liter';
        }

        // Use "g" instead of "grams" for display purposes
        if (unit === 'grams' && totalQuantity < 1000) {
            dynamicUnit = 'g';
        }

        return `${parseFloat(dynamicQuantity)} ${dynamicUnit}`;
    };

    return (
        <div className='food-item'>
            <div className="food-item-img-container">
                <img src={image} alt="" className="food-item-image" />
                {
                    itemQuantity === 0
                        ? <button className='add-btn' onClick={() => addToCart(id, shopId)}>Add</button>
                        : <div className="food-item-counter">
                            <img onClick={() => removeFromCart(id, shopId)} src={assetsUser.remove_icon_red} alt="" />
                            <p>{calculateDynamicQuantity()}</p>
                            <img onClick={() => addToCart(id, shopId)} src={assetsUser.add_icon_green} alt="" />
                        </div>
                }
            </div>

            <div className="food-item-info">
                <div className="food-item-name-rating">
                    <p>{name}</p>
                    <span>{quantity} {unit === 'grams' ? 'g' : unit === 'dozen' ? 'Dozen' : unit}</span> {/* Show "Dozen" for dozen unit */}
                </div>
                <p className="food-item-desc">{description}</p>
                <p className="food-item-price">&#8377;{price}</p>
            </div>
        </div>
    );
};

export default FoodItem;
