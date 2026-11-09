/**
 * Food Bazar Café — official menu (Rs / PKR)
 * Size variants are separate POS items for easy ordering.
 */
export const MENU_CATEGORIES = [
  {
    name: 'Appetizers',
    order: 1,
    items: [
      ['Nuggets (10 Pcs)', 'Chicken nuggets', 500],
      ['French Fries', '', 200],
      ['Loaded Fries', '', 550],
      ['Hot Wings (5 Pcs)', '', 300],
      ['Hot Wings (10 Pcs)', '', 600],
      ['Buffalo Wings (5 Pcs)', '', 350],
      ['Buffalo Wings (10 Pcs)', '', 700],
      ['Sweet Chilli Wings (5 Pcs)', '', 350],
      ['Sweet Chilli Wings (10 Pcs)', '', 700],
      ['Barbeque Wings (5 Pcs)', '', 350],
      ['Barbeque Wings (10 Pcs)', '', 700],
      ['Fish Nuggets (10 Pcs)', '', 600],
    ],
  },
  {
    name: 'Soups',
    order: 2,
    items: [
      ['Hot & Sour Soup (Single)', '', 150],
      ['Hot & Sour Soup (Family)', '', 550],
      ['Chicken Corn Soup (Single)', '', 150],
      ['Chicken Corn Soup (Family)', '', 550],
      ['Chef Special Soup (Single)', '', 170],
      ['Chef Special Soup (Family)', '', 650],
    ],
  },
  {
    name: 'Rolls & Wraps',
    order: 3,
    items: [
      ['Chicken Pratha Roll', '', 350],
      ['Chicken Pratha Roll (Double Roti)', '2 paratha / roti', 450],
      ['Zinger Pratha Roll', '', 400],
      ['Zinger Pratha Roll (Double Roti)', '2 paratha / roti', 500],
      ['Arabic Wrap', '', 450],
      ['Crispy Wrap', '', 400],
      ['Fajita Wrap', '', 400],
      ['Panini Sandwich', '', 500],
    ],
  },
  {
    name: 'Burgers',
    order: 4,
    items: [
      ['Zinger Burger', '', 350],
      ['Chicken Burger', '', 300],
      ['Beef Burger', '', 450],
      ['Chicken Cheese Burger', '', 350],
      ['Beef Cheese Burger', '', 500],
      ['Tower Burger', '', 550],
      ['Afghani Burger', '', 250],
    ],
  },
  {
    name: 'Pastas',
    order: 5,
    items: [
      ['Mac & Cheese', '', 700],
      ['Alfredo', '', 700],
    ],
  },
  {
    name: 'Steaks',
    order: 6,
    items: [
      ['New York Steak (Chicken)', '', 1400],
      ['New York Steak (Beef)', '', 1600],
      ['Mexican Steak (Chicken)', '', 1400],
      ['Mexican Steak (Beef)', '', 1600],
    ],
  },
  {
    name: 'Pizza',
    order: 7,
    items: [
      ['Calzone (Medium)', '', 1300],
      ['Calzone (Large)', '', 1550],
      ['Chicken Tikka Pizza (Small)', '', 700],
      ['Chicken Tikka Pizza (Medium)', '', 1150],
      ['Chicken Tikka Pizza (Large)', '', 1400],
      ['Fajita Pizza (Small)', '', 700],
      ['Fajita Pizza (Medium)', '', 1150],
      ['Fajita Pizza (Large)', '', 1400],
      ['Crown Crust Pizza (Medium)', '', 1360],
      ['Crown Crust Pizza (Large)', '', 1600],
      ['Turkish Pizza (Medium)', '', 1300],
      ['Turkish Pizza (Large)', '', 1600],
      ['Chef Special Pizza (Medium)', '', 1160],
      ['Chef Special Pizza (Large)', '', 1450],
    ],
  },
  {
    name: 'Chinese',
    order: 8,
    items: [
      ['Chicken Fried Rice', '', 350],
      ['Vegetable Rice', '', 300],
      ['Egg Rice', '', 250],
      ['Manchurian Rice', '', 500],
      ['Chicken Chilli Dry', '', 600],
      ['Beef Chilli Dry', '', 700],
      ['Chicken Chowmein', '', 450],
    ],
  },
  {
    name: 'Steam Chicken',
    order: 9,
    items: [
      ['Steam Chicken (Half)', '', 750],
      ['Steam Chicken (Full)', '', 1300],
    ],
  },
];
