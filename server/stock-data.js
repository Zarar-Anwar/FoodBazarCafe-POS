/**
 * Stock items to track for Food Bazar Café (kitchen portions).
 * We track ingredients/portions that run out — not every spice.
 *
 * Why these:
 * - Roti / Paratha / Bun / Wrap → breads (you asked about double roti)
 * - Chicken / Beef / Wings / Nuggets → main proteins
 * - Fries, Rice, Pasta, Pizza dough, Steam chicken → high-use portions
 */
export const STOCK_ITEMS = [
  // code, name, unit, opening_qty, low_alert
  ['paratha', 'Paratha / Roti', 'pcs', 100, 20],
  ['burger_bun', 'Burger Bun', 'pcs', 80, 15],
  ['wrap', 'Wrap Tortilla', 'pcs', 60, 12],
  ['panini_bread', 'Panini Bread', 'pcs', 40, 8],
  ['chicken_nugget', 'Chicken Nugget', 'pcs', 200, 40],
  ['fish_nugget', 'Fish Nugget', 'pcs', 100, 20],
  ['wing', 'Chicken Wing', 'pcs', 200, 40],
  ['fries_portion', 'French Fries Portion', 'portion', 80, 15],
  ['chicken_portion', 'Chicken Portion', 'portion', 100, 20],
  ['beef_portion', 'Beef Portion', 'portion', 60, 12],
  ['soup_single', 'Soup (Single bowl)', 'bowl', 40, 8],
  ['soup_family', 'Soup (Family pot)', 'pot', 15, 3],
  ['pasta_portion', 'Pasta Portion', 'portion', 40, 8],
  ['pizza_dough_s', 'Pizza Dough (Small)', 'pcs', 30, 6],
  ['pizza_dough_m', 'Pizza Dough (Medium)', 'pcs', 40, 8],
  ['pizza_dough_l', 'Pizza Dough (Large)', 'pcs', 30, 6],
  ['rice_portion', 'Rice Portion', 'portion', 60, 12],
  ['steam_half', 'Steam Chicken Half', 'pcs', 20, 4],
  ['steam_full', 'Steam Chicken Full', 'pcs', 15, 3],
  ['cheese_slice', 'Cheese Slice', 'pcs', 80, 15],
  ['egg', 'Egg', 'pcs', 60, 12],
];

/**
 * Map menu product name → stock usage [{ code, qty }]
 * Qty is what ONE sale deducts (e.g. double roti = 2 paratha).
 */
export const PRODUCT_RECIPES = {
  'Nuggets (10 Pcs)': [{ code: 'chicken_nugget', qty: 10 }],
  'French Fries': [{ code: 'fries_portion', qty: 1 }],
  'Loaded Fries': [{ code: 'fries_portion', qty: 1 }, { code: 'cheese_slice', qty: 2 }],
  'Hot Wings (5 Pcs)': [{ code: 'wing', qty: 5 }],
  'Hot Wings (10 Pcs)': [{ code: 'wing', qty: 10 }],
  'Buffalo Wings (5 Pcs)': [{ code: 'wing', qty: 5 }],
  'Buffalo Wings (10 Pcs)': [{ code: 'wing', qty: 10 }],
  'Sweet Chilli Wings (5 Pcs)': [{ code: 'wing', qty: 5 }],
  'Sweet Chilli Wings (10 Pcs)': [{ code: 'wing', qty: 10 }],
  'Barbeque Wings (5 Pcs)': [{ code: 'wing', qty: 5 }],
  'Barbeque Wings (10 Pcs)': [{ code: 'wing', qty: 10 }],
  'Fish Nuggets (10 Pcs)': [{ code: 'fish_nugget', qty: 10 }],

  'Hot & Sour Soup (Single)': [{ code: 'soup_single', qty: 1 }],
  'Hot & Sour Soup (Family)': [{ code: 'soup_family', qty: 1 }],
  'Chicken Corn Soup (Single)': [{ code: 'soup_single', qty: 1 }],
  'Chicken Corn Soup (Family)': [{ code: 'soup_family', qty: 1 }],
  'Chef Special Soup (Single)': [{ code: 'soup_single', qty: 1 }],
  'Chef Special Soup (Family)': [{ code: 'soup_family', qty: 1 }],

  'Chicken Pratha Roll': [
    { code: 'paratha', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
  ],
  'Chicken Pratha Roll (Double Roti)': [
    { code: 'paratha', qty: 2 },
    { code: 'chicken_portion', qty: 1 },
  ],
  'Zinger Pratha Roll': [
    { code: 'paratha', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
  ],
  'Zinger Pratha Roll (Double Roti)': [
    { code: 'paratha', qty: 2 },
    { code: 'chicken_portion', qty: 1 },
  ],
  'Arabic Wrap': [
    { code: 'wrap', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
  ],
  'Crispy Wrap': [
    { code: 'wrap', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
  ],
  'Fajita Wrap': [
    { code: 'wrap', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
  ],
  'Panini Sandwich': [
    { code: 'panini_bread', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
  ],

  'Zinger Burger': [
    { code: 'burger_bun', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
  ],
  'Chicken Burger': [
    { code: 'burger_bun', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
  ],
  'Beef Burger': [
    { code: 'burger_bun', qty: 1 },
    { code: 'beef_portion', qty: 1 },
  ],
  'Chicken Cheese Burger': [
    { code: 'burger_bun', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
    { code: 'cheese_slice', qty: 1 },
  ],
  'Beef Cheese Burger': [
    { code: 'burger_bun', qty: 1 },
    { code: 'beef_portion', qty: 1 },
    { code: 'cheese_slice', qty: 1 },
  ],
  'Tower Burger': [
    { code: 'burger_bun', qty: 2 },
    { code: 'chicken_portion', qty: 2 },
    { code: 'cheese_slice', qty: 2 },
  ],
  'Afghani Burger': [
    { code: 'burger_bun', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
  ],

  'Mac & Cheese': [{ code: 'pasta_portion', qty: 1 }, { code: 'cheese_slice', qty: 2 }],
  Alfredo: [{ code: 'pasta_portion', qty: 1 }],

  'New York Steak (Chicken)': [{ code: 'chicken_portion', qty: 2 }],
  'New York Steak (Beef)': [{ code: 'beef_portion', qty: 2 }],
  'Mexican Steak (Chicken)': [{ code: 'chicken_portion', qty: 2 }],
  'Mexican Steak (Beef)': [{ code: 'beef_portion', qty: 2 }],

  'Calzone (Medium)': [{ code: 'pizza_dough_m', qty: 1 }, { code: 'chicken_portion', qty: 1 }],
  'Calzone (Large)': [{ code: 'pizza_dough_l', qty: 1 }, { code: 'chicken_portion', qty: 1.5 }],
  'Chicken Tikka Pizza (Small)': [
    { code: 'pizza_dough_s', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
  ],
  'Chicken Tikka Pizza (Medium)': [
    { code: 'pizza_dough_m', qty: 1 },
    { code: 'chicken_portion', qty: 1.5 },
  ],
  'Chicken Tikka Pizza (Large)': [
    { code: 'pizza_dough_l', qty: 1 },
    { code: 'chicken_portion', qty: 2 },
  ],
  'Fajita Pizza (Small)': [
    { code: 'pizza_dough_s', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
  ],
  'Fajita Pizza (Medium)': [
    { code: 'pizza_dough_m', qty: 1 },
    { code: 'chicken_portion', qty: 1.5 },
  ],
  'Fajita Pizza (Large)': [
    { code: 'pizza_dough_l', qty: 1 },
    { code: 'chicken_portion', qty: 2 },
  ],
  'Crown Crust Pizza (Medium)': [
    { code: 'pizza_dough_m', qty: 1 },
    { code: 'chicken_portion', qty: 1.5 },
  ],
  'Crown Crust Pizza (Large)': [
    { code: 'pizza_dough_l', qty: 1 },
    { code: 'chicken_portion', qty: 2 },
  ],
  'Turkish Pizza (Medium)': [
    { code: 'pizza_dough_m', qty: 1 },
    { code: 'beef_portion', qty: 1.5 },
  ],
  'Turkish Pizza (Large)': [
    { code: 'pizza_dough_l', qty: 1 },
    { code: 'beef_portion', qty: 2 },
  ],
  'Chef Special Pizza (Medium)': [
    { code: 'pizza_dough_m', qty: 1 },
    { code: 'chicken_portion', qty: 1.5 },
  ],
  'Chef Special Pizza (Large)': [
    { code: 'pizza_dough_l', qty: 1 },
    { code: 'chicken_portion', qty: 2 },
  ],

  'Chicken Fried Rice': [
    { code: 'rice_portion', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
  ],
  'Vegetable Rice': [{ code: 'rice_portion', qty: 1 }],
  'Egg Rice': [{ code: 'rice_portion', qty: 1 }, { code: 'egg', qty: 1 }],
  'Manchurian Rice': [
    { code: 'rice_portion', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
  ],
  'Chicken Chilli Dry': [{ code: 'chicken_portion', qty: 1.5 }],
  'Beef Chilli Dry': [{ code: 'beef_portion', qty: 1.5 }],
  'Chicken Chowmein': [
    { code: 'pasta_portion', qty: 1 },
    { code: 'chicken_portion', qty: 1 },
  ],

  'Steam Chicken (Half)': [{ code: 'steam_half', qty: 1 }],
  'Steam Chicken (Full)': [{ code: 'steam_full', qty: 1 }],
};
