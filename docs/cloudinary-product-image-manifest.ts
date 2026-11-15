/** Verified Cloudinary delivery assets. This inventory does not change product data. */
export interface CloudinaryDrinkImage {
  name: string;
  publicId: string;
  folder: 'Drink_Images/brew_boba_drinks_transparent' | 'Drink_Images/drinks';
  secureUrl: `https://res.cloudinary.com/dr5o7ft6/image/upload/${string}`;
}

export const cloudinaryDrinkImages: readonly CloudinaryDrinkImage[] = [
  { name: 'Iced Milk Tea', publicId: '01_iced_milk_tea', folder: 'Drink_Images/brew_boba_drinks_transparent', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704214/01_iced_milk_tea.png' },
  { name: 'Cappuccino', publicId: '02_cappuccino', folder: 'Drink_Images/brew_boba_drinks_transparent', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704052/02_cappuccino.png' },
  { name: 'Café Latte', publicId: '03_cafe_latte', folder: 'Drink_Images/brew_boba_drinks_transparent', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704050/03_cafe_latte.png' },
  { name: 'Orange Bubble Tea', publicId: '04_orange_bubble_tea', folder: 'Drink_Images/brew_boba_drinks_transparent', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704051/04_orange_bubble_tea.png' },
  { name: 'Strawberry Smoothie', publicId: '05_strawberry_smoothie', folder: 'Drink_Images/brew_boba_drinks_transparent', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704080/05_strawberry_smoothie.png' },
  { name: 'Iced Coffee', publicId: '06_iced_coffee', folder: 'Drink_Images/brew_boba_drinks_transparent', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704051/06_iced_coffee.png' },
  { name: 'Lemon Iced Tea', publicId: '07_lemon_iced_tea', folder: 'Drink_Images/brew_boba_drinks_transparent', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704051/07_lemon_iced_tea.png' },
  { name: 'Iced Matcha Latte', publicId: '08_iced_matcha_latte', folder: 'Drink_Images/brew_boba_drinks_transparent', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704051/08_iced_matcha_latte.png' },
  { name: 'Chocolate Frappé', publicId: '09_chocolate_frappe', folder: 'Drink_Images/brew_boba_drinks_transparent', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704053/09_chocolate_frappe.png' },
  { name: 'Brown Sugar Boba', publicId: '10_brown_sugar_boba', folder: 'Drink_Images/brew_boba_drinks_transparent', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704052/10_brown_sugar_boba.png' },
  { name: 'Iced Green Tea', publicId: 'iced_green_tea_brew_boba_transparent', folder: 'Drink_Images/drinks', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704370/iced_green_tea_brew_boba_transparent.png' },
  { name: 'Caramel Macchiato', publicId: 'caramel_macchiato_with_caramel_lattice_foam_transparent', folder: 'Drink_Images/drinks', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704349/caramel_macchiato_with_caramel_lattice_foam_transparent.png' },
  { name: 'Peach Fruit Tea', publicId: 'brew_boba_peach_fruit_tea_transparent', folder: 'Drink_Images/drinks', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704414/brew_boba_peach_fruit_tea_transparent.png' },
  { name: 'Mango Smoothie', publicId: 'brew_boba_mango_smoothie_transparent', folder: 'Drink_Images/drinks', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704415/brew_boba_mango_smoothie_transparent.png' },
  { name: 'Flat White', publicId: 'brew_boba_flat_white_transparent', folder: 'Drink_Images/drinks', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704413/brew_boba_flat_white_transparent.png' },
  { name: 'Cookies and Cream Shake', publicId: 'cookies_and_cream_brew_boba_shake_transparent', folder: 'Drink_Images/drinks', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704417/cookies_and_cream_brew_boba_shake_transparent.png' },
  { name: 'Espresso', publicId: 'brew_boba_espresso_elegance_transparent', folder: 'Drink_Images/drinks', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704412/brew_boba_espresso_elegance_transparent.png' },
  { name: 'Vanilla Frappé', publicId: 'vanilla_frappé_with_whipped_cream_transparent', folder: 'Drink_Images/drinks', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704418/vanilla_frappe%CC%81_with_whipped_cream_transparent.png' },
  { name: 'Hot Chocolate', publicId: 'brew_boba_hot_chocolate_delight_transparent', folder: 'Drink_Images/drinks', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704346/brew_boba_hot_chocolate_delight_transparent.png' },
  { name: 'Taro Boba', publicId: 'taro_boba_bliss_at_brew_boba_transparent', folder: 'Drink_Images/drinks', secureUrl: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704416/taro_boba_bliss_at_brew_boba_transparent.png' },
] as const;
