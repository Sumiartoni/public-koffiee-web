import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Coffee, MapPin, CheckCircle, Smartphone, X, Plus, Minus, Download, ChevronRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.pkpos.my.id/api';


export default function App() {
    const [view, setView] = useState('menu');
    const [menu, setMenu] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCat, setSelectedCat] = useState('all');
    const [cart, setCart] = useState([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [qtyModal, setQtyModal] = useState(null);
    const [orderSuccess, setOrderSuccess] = useState(null);
    const [loading, setLoading] = useState(true);

    // User details
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddr, setCustomerAddr] = useState('');
    const [payMethod, setPayMethod] = useState('cash');
    const [orderType, setOrderType] = useState('delivery'); // Default delivery agar input alamat muncul
    const [promoCode, setPromoCode] = useState('');
    const [activeDiscount, setActiveDiscount] = useState(null);
    const [discountError, setDiscountError] = useState('');
    const [activePromos, setActivePromos] = useState([]);
    const [availableDiscounts, setAvailableDiscounts] = useState([]);

    useEffect(() => {
        fetchData();
        if (window.location.pathname === '/download') setView('download');
    }, []);

    const fetchData = async () => {
        console.log('🔄 Fetching data from API:', API_URL);

        try {
            // Fetch menu items
            console.log('📋 Fetching menu...');
            const mRes = await axios.get(`${API_URL}/menu`);
            console.log('✅ Menu fetched:', mRes.data.items?.length, 'items');
            setMenu(mRes.data.items || []);
        } catch (err) {
            console.error("❌ Error fetching menu:", err.message, err.response?.status);
            setMenu([]);
        }

        try {
            // Fetch categories
            console.log('📁 Fetching categories...');
            const cRes = await axios.get(`${API_URL}/menu/categories/all`);
            console.log('✅ Categories fetched:', cRes.data.categories?.length, 'categories');
            setCategories(cRes.data.categories || []);
        } catch (err) {
            console.error("❌ Error fetching categories:", err.message, err.response?.status);
            setCategories([]);
        }

        try {
            // Fetch promos
            console.log('🎁 Fetching promos...');
            const pRes = await axios.get(`${API_URL}/promos/public/active`);
            console.log('✅ Promos fetched:', pRes.data);
            setActivePromos(pRes.data.promotions || []);
            setAvailableDiscounts(pRes.data.discounts || []);
        } catch (err) {
            console.error("❌ Error fetching promos:", err.message, err.response?.status);
            setActivePromos([]);
            setAvailableDiscounts([]);
        }

        setLoading(false);
        console.log('🏁 Data fetching complete');
    };

    const calculateSubtotal = () => cart.reduce((a, b) => a + (b.price * b.quantity), 0);

    const calculateDiscount = () => {
        if (!activeDiscount) return 0;

        let applicableSubtotal = 0;
        if (activeDiscount.category_id) {
            // Only items in the specified category
            applicableSubtotal = cart
                .filter(item => Number(item.category_id) === Number(activeDiscount.category_id))
                .reduce((a, b) => a + (b.price * b.quantity), 0);
        } else {
            // All items
            applicableSubtotal = calculateSubtotal();
        }

        if (applicableSubtotal === 0) return 0;

        if (activeDiscount.type === 'nominal') return Math.min(activeDiscount.value, applicableSubtotal);

        const disc = (applicableSubtotal * activeDiscount.value) / 100;
        return activeDiscount.max_discount ? Math.min(disc, activeDiscount.max_discount) : disc;
    };

    const calculateTotal = () => {
        const sub = calculateSubtotal();
        const disc = calculateDiscount();
        return Math.max(0, sub - disc);
    };

    const addToCart = (item, quantity, selectedExtras = []) => {
        setCart(prev => {
            const extraIds = selectedExtras.map(e => e.id).sort().join(',');
            const cartId = `${item.id}-${extraIds}`;

            const exists = prev.find(i => i.cartId === cartId && !i.is_free);
            let nextCart;

            // Calculate price including extras
            const extraPrice = selectedExtras.reduce((acc, e) => acc + e.price, 0);
            const finalPrice = item.price + extraPrice;

            if (exists) {
                nextCart = prev.map(i => i.cartId === cartId && !i.is_free ? { ...i, quantity: i.quantity + quantity } : i);
            } else {
                nextCart = [...prev, {
                    ...item,
                    cartId,
                    quantity,
                    price: finalPrice,
                    basePrice: item.price,
                    selectedExtras,
                    is_free: false
                }];
            }

            return applyAutomatedPromos(nextCart);
        });
        setQtyModal(null);
    };

    const applyAutomatedPromos = (currentCart) => {
        let filteredCart = currentCart.filter(i => !i.is_free);
        const subForPromo = filteredCart.reduce((acc, i) => acc + (i.price * i.quantity), 0);

        activePromos.forEach(promo => {
            if (promo.type === 'buy_x_get_y') {
                const buyItem = filteredCart.find(i => i.id === promo.buy_item_id);
                if (buyItem && buyItem.quantity >= promo.buy_qty && subForPromo >= promo.min_purchase) {
                    const multiplier = Math.floor(buyItem.quantity / promo.buy_qty);
                    const freeQty = multiplier * promo.get_qty;

                    const freeItemTarget = menu.find(m => m.id === (promo.get_item_id || promo.buy_item_id));
                    if (freeItemTarget) {
                        filteredCart.push({
                            ...freeItemTarget,
                            quantity: freeQty,
                            price: 0,
                            is_free: true,
                            promo_name: promo.name
                        });
                    }
                }
            }
        });
        return filteredCart;
    };

    const applyPromoCode = () => {
        setDiscountError('');
        if (!promoCode) {
            setActiveDiscount(null);
            return;
        }

        // Cari voucher yang kodenya cocok
        const found = availableDiscounts.find(d => d.code && d.code.toUpperCase() === promoCode.toUpperCase());

        if (found) {
            const sub = calculateSubtotal();
            if (sub < found.min_purchase) {
                setDiscountError(`Minimal belanja Rp ${found.min_purchase.toLocaleString()} untuk voucher ini.`);
                setActiveDiscount(null);
            } else {
                setActiveDiscount(found);
                setDiscountError('');
            }
        } else {
            setActiveDiscount(null);
            setDiscountError('Kode voucher tidak valid atau sudah kadaluarsa.');
        }
    };

    const submitOrder = async () => {
        if (!customerName || !customerPhone) return alert("Mohon isi Nama dan No. WhatsApp.");
        if (orderType === 'delivery' && (!customerAddr || customerAddr.length < 5)) return alert("Mohon isi alamat pengiriman lengkap.");

        try {
            console.log("Submitting order...", { customerName, cart });
            const resp = await axios.post(`${API_URL}/orders`, {
                customer_name: customerName,
                customer_phone: customerPhone,
                address: customerAddr,
                payment_method: payMethod,
                order_type: orderType, // Kirim 'delivery' atau 'pickup'
                // Tapi kirim info delivery/pickup di notes atau field khusus jika backend support varian online
                notes: `Tipper: ${orderType.toUpperCase()}`,
                address: orderType === 'delivery' ? customerAddr : 'PICKUP AT STORE',
                items: cart.map(i => ({
                    menu_item_id: i.id,
                    quantity: i.quantity,
                    price: i.price,
                    extras: i.selectedExtras ? JSON.stringify(i.selectedExtras) : null
                })),
                discount: calculateDiscount()
            });
            console.log("Order submitted successfully:", resp.data);
            setOrderSuccess(resp.data);
            setCart([]);
            setCartOpen(false);
            setView('success');
        } catch (err) {
            alert("Sepertinya ada gangguan koneksi ke server kasir.");
        }
    };

    if (view === 'download') return <DownloadPage />;

    return (
        <div className="min-h-screen bg-stone-950 text-white">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 py-4 bg-stone-950/80 backdrop-blur-md border-b border-stone-800">
                <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center cursor-pointer" onClick={() => { setView('menu'); setOrderSuccess(null); }}>
                        <img src="/logo-full.png" className="h-12 object-contain" alt="Public Koffiee" />
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 pt-28 pb-20">
                {loading && (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                        <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-stone-500 font-bold">Memuat menu...</p>
                    </div>
                )}

                {view === 'menu' && !orderSuccess && !loading && (
                    <div className="animate-premium">
                        <header className="mb-10">
                            <h2 className="text-4xl font-black italic tracking-tight mb-3">Freshly Brewed<br /><span className="text-amber-500">For You.</span></h2>
                            <p className="text-stone-500 text-sm font-medium">Temukan racikan kopi autentik dari biji kopi pilihan terbaik kami.</p>
                        </header>

                        {/* Categories */}
                        <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide -mx-2 px-2 sticky top-[72px] z-40 bg-stone-950/80 backdrop-blur-md">
                            <button
                                onClick={() => setSelectedCat('all')}
                                className={`px-6 py-2.5 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all ${selectedCat === 'all' ? 'bg-amber-600 border-amber-500 text-stone-950 shadow-lg shadow-amber-900/40' : 'bg-stone-900/50 border-stone-800 text-stone-500'}`}
                            >
                                All Items
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCat(cat.slug)}
                                    className={`px-6 py-2.5 rounded-2xl border text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedCat === cat.slug ? 'bg-amber-600 border-amber-500 text-stone-950 shadow-lg shadow-amber-900/40' : 'bg-stone-900/50 border-stone-800 text-stone-500'}`}
                                >
                                    {cat.emoji} {cat.name}
                                </button>
                            ))}
                        </div>

                        {/* Menu Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-4">
                            {menu.length === 0 && (
                                <div className="col-span-2 lg:col-span-3 text-center py-20">
                                    <p className="text-6xl mb-4">☕</p>
                                    <p className="text-stone-500 font-bold">Menu tidak tersedia</p>
                                    <p className="text-stone-700 text-sm mt-2">Silakan cek koneksi atau hubungi admin</p>
                                </div>
                            )}
                            {menu.filter(i => selectedCat === 'all' || i.category_slug === selectedCat).map(item => (
                                <motion.div
                                    layout key={item.id}
                                    onClick={() => setQtyModal({ item, quantity: 1, selectedExtras: [] })}
                                    className="bg-stone-900/40 border border-stone-800 p-4 rounded-3xl group cursor-pointer active:scale-95 transition-all hover:border-amber-500/50"
                                >
                                    <div className="relative">
                                        <div className="w-full aspect-square bg-stone-950 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border border-stone-800">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            ) : (
                                                <span className="text-4xl md:text-6xl">{item.emoji}</span>
                                            )}
                                        </div>
                                        {item.extras?.length > 0 && <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 rounded-md text-[7px] font-black uppercase text-stone-950 tracking-widest shadow-lg">Extra+</div>}
                                    </div>
                                    <p className="text-stone-500 text-[8px] font-black uppercase tracking-widest mb-1">{item.category_name}</p>
                                    <h3 className="text-sm md:text-lg font-black mb-3 leading-tight line-clamp-2">{item.name}</h3>
                                    <div className="flex justify-between items-center border-t border-stone-800/60 pt-3">
                                        <span className="text-sm md:text-lg font-black text-amber-500 italic">
                                            Rp {item.price.toLocaleString()}
                                        </span>
                                        <button className="w-8 h-8 md:w-10 md:h-10 bg-amber-600 rounded-xl flex items-center justify-center text-stone-950">
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'checkout' && (
                    <div className="max-w-2xl mx-auto animate-premium">
                        <div className="bg-stone-900/40 border border-stone-800 p-8 md:p-12 rounded-[3rem]">
                            <h2 className="text-3xl font-black italic mb-10">ORDER DETAILS</h2>
                            <div className="space-y-4 mb-10 bg-stone-950/40 p-6 rounded-3xl border border-stone-800">
                                {cart.map((item, idx) => (
                                    <div key={item.cartId || idx} className="py-3 border-b border-stone-800/50 last:border-0">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-bold">{item.quantity}x {item.name}</span>
                                            <span className="font-black text-amber-500">Rp {(item.price * item.quantity).toLocaleString()}</span>
                                        </div>
                                        {item.selectedExtras?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1 pl-4">
                                                {item.selectedExtras.map((ex, i) => (
                                                    <span key={i} className="text-[10px] text-stone-500 uppercase">+ {ex.name}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {activeDiscount && (
                                    <div className="flex justify-between items-center text-sm text-emerald-500 pt-2 border-t border-stone-800">
                                        <span>Diskon ({activeDiscount.name})</span>
                                        <span>- Rp {calculateDiscount().toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="pt-4 flex justify-between items-center text-xl font-black text-white">
                                    <span>TOTAL</span>
                                    <span className="text-2xl text-amber-500 italic">Rp {calculateTotal().toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Voucher Input */}
                            <div className="mb-10">
                                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block mb-2 px-1">Punya Kode Voucher?</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                        className="flex-1 bg-stone-950 border border-stone-800 p-4 rounded-2xl outline-none focus:border-emerald-500 font-mono text-emerald-500 font-bold placeholder:text-stone-700 uppercase"
                                        placeholder="KODEVOUCHER"
                                    />
                                    <button
                                        onClick={applyPromoCode}
                                        className="bg-emerald-600 hover:bg-emerald-500 py-4 px-6 rounded-2xl font-black text-stone-950 transition-all shadow-lg"
                                    >
                                        PAKAI
                                    </button>
                                </div>
                                {discountError && <p className="text-[10px] text-red-500 font-bold px-1 mt-2">{discountError}</p>}
                                {activeDiscount && activeDiscount.code && <p className="text-emerald-500 text-[9px] font-bold px-1 uppercase tracking-tight mt-2">Voucher "{activeDiscount.name}" Terpasang!</p>}
                            </div>

                            {/* Available general discounts (No Code) */}
                            {availableDiscounts.filter(d => !d.code || d.code === '').length > 0 && (
                                <div className="mt-6 space-y-3">
                                    <p className="text-[9px] font-black text-stone-600 uppercase tracking-widest px-1">Program Diskon Tersedia</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {availableDiscounts.filter(d => !d.code || d.code === '').map(disc => (
                                            <button
                                                key={disc.id}
                                                onClick={() => {
                                                    const sub = calculateSubtotal();
                                                    if (sub < disc.min_purchase) {
                                                        alert(`Minimal belanja Rp ${disc.min_purchase.toLocaleString()} untuk promo ini.`);
                                                        return;
                                                    }
                                                    setActiveDiscount(disc);
                                                    setPromoCode(''); // Clear manual code if selecting from list
                                                }}
                                                className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all ${activeDiscount?.id === disc.id ? 'bg-emerald-600 border-emerald-500 text-stone-950 font-black' : 'bg-stone-950 border-stone-800 text-stone-400 font-bold'}`}
                                            >
                                                <div className="text-left">
                                                    <p className="text-[11px] uppercase italic">{disc.name}</p>
                                                    <p className="text-[8px] opacity-60">MIN. Rp {disc.min_purchase.toLocaleString()}</p>
                                                </div>
                                                <span className="text-sm italic">
                                                    {disc.type === 'percentage' ? `${disc.value}%` : `Rp ${disc.value.toLocaleString()}`}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <h2 className="text-3xl font-black italic mb-8 uppercase">Pengiriman</h2>

                        {/* Toggle Order Type */}
                        <div className="flex bg-stone-950 p-1 rounded-2xl border border-stone-800 mb-8">
                            <button
                                onClick={() => setOrderType('pickup')}
                                className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${orderType === 'pickup' ? 'bg-amber-600 text-stone-950 shadow-lg' : 'bg-stone-800 text-stone-500'}`}
                            >
                                🛍️ Pickup
                            </button>
                            <button
                                onClick={() => setOrderType('delivery')}
                                className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${orderType === 'delivery' ? 'bg-amber-600 text-stone-950 shadow-lg' : 'bg-stone-800 text-stone-500'}`}
                            >
                                🛵 Delivery
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block mb-2 px-1">Nama Customer</label>
                                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-stone-950 border border-stone-800 p-4 rounded-2xl outline-none focus:border-amber-500" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block mb-2 px-1">No. WhatsApp</label>
                                    <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full bg-stone-950 border border-stone-800 p-4 rounded-2xl outline-none focus:border-amber-500" placeholder="0812XXX" />
                                </div>
                            </div>

                            {orderType === 'delivery' ? (
                                <div className="animate-premium">
                                    <div className="flex justify-between items-center mb-2 px-1 gap-2">
                                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block">Alamat Pengiriman</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    if (!navigator.geolocation) return alert('Browser tidak support GPS');
                                                    setCustomerAddr('Mencari lokasi...');
                                                    navigator.geolocation.getCurrentPosition(
                                                        (pos) => {
                                                            const link = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
                                                            setCustomerAddr(link);
                                                        },
                                                        (err) => {
                                                            alert('Gagal mengambil lokasi GPS. Pastikan izin lokasi aktif.');
                                                            setCustomerAddr('');
                                                        }
                                                    );
                                                }}
                                                className="text-[9px] font-black bg-stone-800 text-stone-300 px-2 py-1 rounded hover:bg-stone-700 flex items-center gap-1"
                                            >
                                                📍 Gunakan GPS Saya
                                            </button>
                                            {customerAddr.includes('http') && (
                                                <button
                                                    onClick={() => window.open(customerAddr, '_blank')}
                                                    className="text-[9px] font-bold text-amber-500 hover:underline flex items-center gap-1"
                                                >
                                                    <MapPin size={10} /> Cek Link
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <textarea
                                        value={customerAddr}
                                        onChange={(e) => setCustomerAddr(e.target.value)}
                                        className="w-full bg-stone-950 border border-stone-800 p-4 rounded-2xl h-24 outline-none focus:border-amber-500 mb-2 text-xs font-mono"
                                        placeholder="Klik tombol GPS atau ketik alamat..."
                                    ></textarea>
                                    <p className="text-[10px] text-stone-600 pb-2">*Gunakan tombol GPS agar kurir mendapat titik akurat.</p>

                                    {/* MAPS PREVIEW/EMBED */}
                                    {customerAddr && (
                                        <div className="w-full h-40 bg-stone-900 rounded-2xl overflow-hidden border border-stone-800 animate-premium mb-4">
                                            <iframe
                                                width="100%"
                                                height="100%"
                                                frameBorder="0"
                                                style={{ border: 0 }}
                                                src={`https://maps.google.com/maps?q=${encodeURIComponent(customerAddr.includes('http') ? customerAddr : customerAddr)}&output=embed`}
                                                allowFullScreen
                                            ></iframe>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-stone-950 border border-stone-800 p-4 rounded-2xl flex gap-4 items-center animate-premium">
                                    <div className="w-12 h-12 bg-stone-900 rounded-xl flex items-center justify-center text-amber-500"><MapPin /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Lokasi Pickup</p>
                                        <p className="font-bold text-sm text-white">Public Koffiee Store</p>
                                        <p className="text-xs text-stone-500">Jl. Kopi Premium No. 88, Jakarta Selatan</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block mb-4 px-1">Metode Pembayaran</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setPayMethod('cash')} className={`p-4 rounded-2xl border-2 transition-all font-bold ${payMethod === 'cash' ? 'border-amber-600 bg-amber-600/10 text-amber-500' : 'border-stone-800 bg-stone-950'}`}>💵 {orderType === 'delivery' ? 'COD (Bayar Kurir)' : 'Bayar di Kasir'}</button>
                                    <button onClick={() => setPayMethod('qris')} className={`p-4 rounded-2xl border-2 transition-all font-bold ${payMethod === 'qris' ? 'border-amber-600 bg-amber-600/10 text-amber-500' : 'border-stone-800 bg-stone-950'}`}>📱 QRIS (Otomatis)</button>
                                </div>
                            </div>
                            <button onClick={submitOrder} className="w-full bg-amber-600 text-stone-950 py-5 rounded-[2rem] font-black text-xl italic hover:bg-amber-500 transition-all shadow-xl shadow-amber-900/20 mt-6">PESAN SEKARANG</button>
                            <button onClick={() => setView('menu')} className="w-full text-stone-500 font-bold py-2 hover:text-stone-300 uppercase text-[10px] tracking-widest">Kembali ke Menu</button>
                        </div>
                    </div>
                )}

                {view === 'success' && orderSuccess && (
                    <div className="max-w-md mx-auto text-center py-10 animate-premium">
                        <div className="w-20 h-20 bg-amber-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-stone-950 shadow-2xl shadow-amber-900/40">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="text-4xl font-black italic mb-2">PESANAN DITERIMA!</h2>
                        <p className="text-stone-500 mb-8 font-bold">Order #<span className="text-white">{(orderSuccess.order?.order_number) || orderSuccess.order_number || '...'}</span></p>

                        {(orderSuccess.order?.payment_method === 'qris' || orderSuccess.payment_method === 'qris') && (
                            <div className="bg-white p-6 rounded-[2.5rem] mb-10 inline-block shadow-2xl">
                                <img
                                    src={
                                        orderSuccess.payment?.qris_image
                                            ? (
                                                orderSuccess.payment.qris_image.startsWith('data:') || orderSuccess.payment.qris_image.startsWith('http')
                                                    ? orderSuccess.payment.qris_image
                                                    : `${API_URL.replace('/api', '')}${orderSuccess.payment.qris_image}`
                                            )
                                            : orderSuccess.qris
                                    }
                                    alt="QR"
                                    className="w-60 h-60"
                                />
                                <p className="text-stone-950 font-black mt-4 text-[10px] tracking-[0.2em]">{orderSuccess.payment?.final_amount ? `TOTAL: Rp ${orderSuccess.payment.final_amount.toLocaleString()}` : 'SCAN UNTUK MEMBAYAR'}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <button onClick={() => { setView('menu'); setOrderSuccess(null); }} className="w-full bg-stone-900 text-stone-400 font-bold py-4 rounded-2xl border border-stone-800 hover:bg-stone-800 transition-all">Selesai</button>
                        </div>
                    </div>
                )}
            </main>

            {/* Floating Cart Button */}
            <AnimatePresence>
                {cart.length > 0 && view === 'menu' && (
                    <motion.div initial={{ scale: 0, y: 100 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0, y: 100 }} className="fixed bottom-8 right-8 z-[100]">
                        <button onClick={() => setCartOpen(true)} className="flex items-center gap-4 bg-amber-600 text-stone-950 p-4 rounded-[2rem] shadow-2xl shadow-amber-900/40 border-4 border-stone-950">
                            <div className="w-12 h-12 bg-stone-950/20 rounded-2xl flex items-center justify-center relative"><ShoppingCart size={24} /><span className="absolute -top-1 -right-1 w-6 h-6 bg-stone-950 text-white text-[10px] font-black flex items-center justify-center rounded-full border border-stone-800">{cart.length}</span></div>
                            <div className="pr-4 text-left"><p className="text-[10px] font-black uppercase tracking-widest opacity-60">Pesanan Saya</p><p className="text-lg font-black italic -mt-1">Rp {calculateTotal().toLocaleString()}</p></div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cart Sidebar */}
            <AnimatePresence>
                {cartOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-stone-950/90 backdrop-blur-xl flex items-end justify-center">
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative w-full max-w-xl bg-stone-900 rounded-t-[3rem] border-t border-stone-800 p-8 flex flex-col max-h-[90vh]">
                            <div className="w-12 h-1.5 bg-stone-800 rounded-full mx-auto mb-8"></div>
                            <div className="flex justify-between items-center mb-8"><h3 className="text-3xl font-black italic tracking-tighter">Your Bag</h3><button onClick={() => setCartOpen(false)} className="w-12 h-12 bg-stone-950 border border-stone-800 rounded-2xl flex items-center justify-center text-stone-500"><X size={20} /></button></div>
                            <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pb-10">
                                {cart.map((item, idx) => (
                                    <div key={item.cartId || idx} className="flex gap-4 p-4 rounded-3xl bg-stone-950/40 border border-stone-800">
                                        <div className="w-16 h-16 bg-stone-950 rounded-2xl flex items-center justify-center text-3xl border border-stone-800">{item.emoji}</div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm uppercase">{item.name}</h4>
                                            {item.selectedExtras?.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1 mb-2">
                                                    {item.selectedExtras.map((ex, i) => (
                                                        <span key={i} className="text-[8px] bg-amber-600/10 text-amber-500 px-2 py-0.5 rounded-full font-bold">+ {ex.name}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-amber-500 font-bold">Rp {(item.price * item.quantity).toLocaleString()}</p>
                                        </div>
                                        <div className="flex flex-col justify-between items-end">
                                            <button onClick={() => setCart(prev => applyAutomatedPromos(prev.filter(i => i.cartId !== item.cartId)))} className="text-stone-700 hover:text-red-500"><X size={16} /></button>
                                            <div className="flex items-center gap-3 bg-stone-950 px-2 py-1 rounded-lg border border-stone-800">
                                                <button onClick={() => setCart(prev => applyAutomatedPromos(prev.map(i => i.cartId === item.cartId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i)))}><Minus size={12} /></button>
                                                <span className="font-black text-xs">{item.quantity}</span>
                                                <button onClick={() => setCart(prev => applyAutomatedPromos(prev.map(i => i.cartId === item.cartId ? { ...i, quantity: i.quantity + 1 } : i)))}><Plus size={12} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-8 border-t border-stone-800">
                                <div className="flex justify-between items-center mb-8 px-2">
                                    <p className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">Bag Total</p>
                                    <p className="text-3xl font-black italic text-amber-500">Rp {calculateTotal().toLocaleString()}</p>
                                </div>
                                <button onClick={() => { setCartOpen(false); setView('checkout'); }} className="w-full bg-amber-600 py-5 rounded-[2rem] font-black text-xl italic text-stone-950 shadow-xl shadow-amber-900/20">DAFTAR PESANAN</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Qty & Extras Modal */}
            <AnimatePresence>
                {qtyModal && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-950/95 backdrop-blur-xl">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-stone-900 border border-stone-800 p-8 rounded-[3rem] w-full max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar">
                            <div className="text-7xl mb-6 text-center">{qtyModal.item.emoji}</div>
                            <h3 className="text-2xl font-black text-center mb-2">{qtyModal.item.name}</h3>
                            <p className="text-amber-500 font-black text-center mb-8 text-xl italic">Rp {qtyModal.item.price.toLocaleString()}</p>

                            {qtyModal.item.extras?.length > 0 && (
                                <div className="mb-8">
                                    <p className="text-[10px] font-black uppercase text-stone-500 mb-4 border-b border-stone-800 pb-2">Pilih Extra</p>
                                    <div className="space-y-2">
                                        {qtyModal.item.extras.map(extra => {
                                            const isSelected = (qtyModal.selectedExtras || []).some(e => e.id === extra.id);
                                            return (
                                                <button
                                                    key={extra.id}
                                                    onClick={() => {
                                                        const current = qtyModal.selectedExtras || [];
                                                        setQtyModal({ ...qtyModal, selectedExtras: isSelected ? current.filter(e => e.id !== extra.id) : [...current, extra] });
                                                    }}
                                                    className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all ${isSelected ? 'bg-amber-600 border-amber-500 text-stone-950 font-bold' : 'bg-stone-950 border-stone-800 text-stone-400'}`}
                                                >
                                                    <span className="text-sm">{extra.name}</span>
                                                    <span className="text-xs italic">+ Rp {extra.price.toLocaleString()}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-center gap-10 mb-10">
                                <button onClick={() => setQtyModal({ ...qtyModal, quantity: Math.max(1, qtyModal.quantity - 1) })} className="w-12 h-12 bg-stone-950 border border-stone-800 rounded-2xl flex items-center justify-center"><Minus size={18} /></button>
                                <span className="text-4xl font-black">{qtyModal.quantity}</span>
                                <button onClick={() => setQtyModal({ ...qtyModal, quantity: qtyModal.quantity + 1 })} className="w-12 h-12 bg-stone-950 border border-stone-800 rounded-2xl flex items-center justify-center"><Plus size={18} /></button>
                            </div>

                            <button
                                onClick={() => addToCart(qtyModal.item, qtyModal.quantity, qtyModal.selectedExtras || [])}
                                className="w-full bg-amber-600 py-5 rounded-[2rem] font-black text-lg italic text-stone-950 shadow-xl shadow-amber-900/20"
                            >
                                TAMBAHKAN • Rp {((qtyModal.item.price + (qtyModal.selectedExtras || []).reduce((a, b) => a + b.price, 0)) * qtyModal.quantity).toLocaleString()}
                            </button>
                            <button onClick={() => setQtyModal(null)} className="w-full text-stone-600 font-bold uppercase text-[10px] py-4">Batal</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DownloadPage() {
    return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6 text-center">
            <div className="bg-stone-900 border border-stone-800 p-12 rounded-[3rem] w-full max-w-sm">
                <div className="w-20 h-20 bg-amber-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-stone-950 shadow-2xl"><Download size={40} /></div>
                <h2 className="text-3xl font-black italic mb-4">APK OWNER</h2>
                <p className="text-stone-500 mb-10 font-bold">Unduh aplikasi Android untuk manajemen kasir.</p>
                <a href="/downloads/coffee-pos.apk" download className="block w-full bg-amber-600 py-5 rounded-[2rem] font-black text-xl italic text-stone-950 shadow-xl shadow-amber-900/20">DOWNLOAD APK</a>
            </div>
        </div>
    );
}
