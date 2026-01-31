// API Configuration - VERCEL READY
// Menggunakan environment variable untuk production
// Menggunakan environment variable untuk production, fallback ke URL Koyeb jika env tidak terbaca
export const API_URL = import.meta.env.VITE_API_URL || 'https://illegal-jacinta-mkrrn-d8f0167d.koyeb.app/api';

// App Configuration
export const SHOP_NAME = 'Public Koffiee';
export const SHOP_TAGLINE = 'Premium Dark Roast Since 2024';
export const SHOP_DESCRIPTION = 'Experience the finest artisanal coffee crafted with passion';
export const SHOP_PHONE = '+62 21 1234 5678';
export const SHOP_EMAIL = 'hello@publickoffiee.id';
export const SHOP_ADDRESS = 'Jl. Kopi Premium No. 88, Jakarta Selatan';


// Social Media
export const SOCIAL_LINKS = {
    instagram: 'https://instagram.com/publickoffiee',
    facebook: 'https://facebook.com/publickoffiee',
    twitter: 'https://twitter.com/publickoffiee'
};

// Features
export const ENABLE_QRIS = true;
export const ENABLE_CASH = true;
export const ENABLE_DELIVERY = true;
export const ENABLE_TAKEAWAY = true;
export const TAX_PERCENTAGE = 10;
export const DELIVERY_FEE = 15000;
export const FREE_DELIVERY_MIN = 100000;

// Order Types
export const ORDER_TYPES = {
    ONLINE: 'online',
    DELIVERY: 'delivery',
    DINE_IN: 'dine-in',
    TAKEAWAY: 'takeaway'
};

// Payment Methods
export const PAYMENT_METHODS = {
    CASH: 'cash',
    QRIS: 'qris',
    TRANSFER: 'transfer',
    EWALLET: 'ewallet'
};

// Business Hours
export const BUSINESS_HOURS = {
    weekday: { open: '07:00', close: '22:00' },
    weekend: { open: '08:00', close: '23:00' }
};

// Theme Colors
export const THEME = {
    primary: '#f59e0b',
    primaryDark: '#d97706',
    accent: '#ea580c',
    background: '#0c0a09',
    surface: '#1c1917',
    text: '#fafaf9',
    textMuted: '#a8a29e'
};
