import React, { useState, useEffect } from 'react';
import './FoodDisplay.css';
import FoodItem from '../FoodItem/FoodItem';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Link } from 'react-router-dom';

const FoodDisplay = ({ foodItems, shopId, isSearching }) => {

    /*  
        Group food items by category
        
        Before
        const foodItems = [
        { name: 'Apple', category: 'Fruits' },
        { name: 'Carrot', category: 'Vegetables' },
        { name: 'Banana', category: 'Fruits' }
    ];

    After
    {
        'Fruits': [
            { name: 'Apple', category: 'Fruits' },
            { name: 'Banana', category: 'Fruits' }
        ],
        'Vegetables': [
            { name: 'Carrot', category: 'Vegetables' }
        ]
    }

    */

    const groupedItems = foodItems.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {});

    // Merge categories with fewer items
    const threshold = 4; // Define the minimum number of items per category
    const mergedCategories = [];
    const smallCategories = [];
    const largeCategories = [];

    Object.keys(groupedItems).forEach((category) => {
        const items = groupedItems[category];
        if (items.length < threshold) {
            smallCategories.push({ title: category, items });
        } else {
            largeCategories.push({ title: category, items });
        }
    });

    // Merge small categories into combined groups
    if (smallCategories.length > 0) {
        let tempGroup = { title: '', items: [] };
        let groupCount = 0; // Keep track of the number of categories merged into a group

        smallCategories.forEach((category, index) => {
            // Add category title and items to the group
            tempGroup.items = [...tempGroup.items, ...category.items];

            if (tempGroup.title) {
                tempGroup.title += `, ${category.title}`;
            } else {
                tempGroup.title = category.title;
            }

            groupCount++;

            // Check if the group is ready to be merged (reaches the threshold, or it's the last category, or has 3 categories)
            if (
                tempGroup.items.length >= threshold ||
                groupCount === 3 ||
                index === smallCategories.length - 1
            ) {
                // Format the title with commas and '&'
                const titles = tempGroup.title.split(', ');
                if (titles.length > 1) {
                    const lastTitle = titles.pop();
                    tempGroup.title = `${titles.join(', ')} & ${lastTitle}`;
                }

                mergedCategories.push(tempGroup);

                // Reset temp group and group count
                tempGroup = { title: '', items: [] };
                groupCount = 0;
            }
        });
    }

    // Combine large categories with merged small categories
    const finalCategories = [...mergedCategories, ...largeCategories];

    return (
        <div className="food-display">
            {loading ? (
                <div className="food-display-loading">
                    {Array(2)
                        .fill(null)
                        .map((_, categoryIndex) => (
                            <div key={categoryIndex} className="food-category-skeleton">
                                {/* Skeleton for category header */}
                                <div className="category-header-skeleton">
                                    <Skeleton width={150} height={24} className="category-title-skeleton" />
                                    <Skeleton width={60} height={20} className="see-all-skeleton" />
                                </div>
                                {/* Skeleton for food items */}
                                <div className="food-category-items-skeleton">
                                    {Array(4)
                                        .fill(null)
                                        .map((_, itemIndex) => (
                                            <div key={itemIndex} className="food-item-skeleton">
                                                <div className="food-item-img-container">
                                                    <Skeleton
                                                        height={150}
                                                        className="food-item-image-skeleton"
                                                    />
                                                </div>
                                                <div className="food-item-info-skeleton">
                                                    <Skeleton
                                                        width="70%"
                                                        height={18}
                                                        className="food-item-name-skeleton"
                                                    />
                                                    <Skeleton
                                                        width="50%"
                                                        height={14}
                                                        className="food-item-desc-skeleton"
                                                    />
                                                    <Skeleton
                                                        width="40%"
                                                        height={18}
                                                        className="food-item-price-skeleton"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}
                </div>
            ) : isSearching ? (
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
            ) : (
                finalCategories.map(({ title, items }) => (
                    <div key={title} className="food-category-section">
                        <div className="category-header">
                            <h2 className="category-title">{title}</h2>
                            <Link
                                to={`/category/${title}`}
                                state={{ foodItems: items, shopId, title }}
                                className="see-all"
                            >
                                See All
                            </Link>
                        </div>
                        <div className="food-category-items">
                            {items.map((item) => (
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
                ))
            )}
        </div>
    );
};

export default FoodDisplay;
