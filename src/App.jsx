import React, { useState, useEffect, useMemo } from 'react';
import {
    ShoppingCart, Package, Users, TrendingUp, Plus, Trash2, Edit, X,
    Menu, Search, LogOut, ChevronRight, Store, CreditCard, CheckCircle,
    AlertCircle, Image as ImageIcon
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import {
    getAuth, signInAnonymously, onAuthStateChanged, signOut
} from 'firebase/auth';
import {
    getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot,
    updateDoc, serverTimestamp
} from 'firebase/firestore';

// ==========================================
// ⚠️ ZONA DE CONFIGURACIÓN OBLIGATORIA ⚠️
// ==========================================
// Reemplaza los valores vacíos con los de tu consola de Firebase
// (Ver Paso 1 de la guía para obtenerlos)
const firebaseConfig = {

    apiKey: "AIzaSyBpRGVRQZztDseOlTlmFSEGY2ur84_uEnI",

    authDomain: "pixelstore-dfba1.firebaseapp.com",

    projectId: "pixelstore-dfba1",

    storageBucket: "pixelstore-dfba1.firebasestorage.app",

    messagingSenderId: "826051147714",

    appId: "1:826051147714:web:2378fb1ee7cda036d4c85b"

};

// Nombre de la colección principal en la base de datos
const COLLECTION_NAME = "tienda_produccion_v1";

// ==========================================
// INICIALIZACIÓN SEGURA DE FIREBASE
// ==========================================
let app, auth, db;
const isConfigured = firebaseConfig.apiKey.length > 0;

if (isConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (error) {
        console.error("Error inicializando Firebase:", error);
    }
}

// --- COMPONENTE PRINCIPAL ---
export default function OnlineStoreApp() {
    // Si no hay configuración, mostrar pantalla de ayuda
    if (!isConfigured) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg text-center">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Falta Configuración</h1>
                    <p className="text-gray-600 mb-6">
                        Para que la tienda funcione, necesitas conectar tu base de datos Firebase.
                    </p>
                    <div className="text-left bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm font-mono overflow-auto">
                        <p className="text-gray-500 mb-2">// Busca esta sección en src/App.jsx y complétala:</p>
                        <pre className="text-indigo-600">
                            {`const firebaseConfig = {
  apiKey: "PEGA_TU_API_KEY_AQUI",
  ...
};`}
                        </pre>
                    </div>
                    <p className="mt-6 text-sm text-gray-500">Revisa la "Parte 1" de la guía para saber dónde obtener estos datos.</p>
                </div>
            </div>
        );
    }

    const [user, setUser] = useState(null);
    const [view, setView] = useState('store'); // store, cart, checkout, admin-login, admin-dashboard
    const [cart, setCart] = useState([]);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [notification, setNotification] = useState(null);

    // --- AUTENTICACIÓN Y CARGA DE DATOS ---
    useEffect(() => {
        // 1. Iniciar sesión anónima automáticamente
        signInAnonymously(auth).catch((error) => {
            console.error("Error de autenticación:", error);
        });

        // 2. Escuchar cambios de sesión
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);

            // Persistencia simple de admin
            const adminSession = localStorage.getItem('isAdminAuthenticated');
            if (adminSession === 'true') setIsAdmin(true);
        });

        return () => unsubscribeAuth();
    }, []);

    // Cargar datos cuando hay usuario
    useEffect(() => {
        if (!user) return;

        // Referencias a colecciones (Estructura simplificada para Vercel)
        const productsRef = collection(db, COLLECTION_NAME, 'data', 'products');
        const ordersRef = collection(db, COLLECTION_NAME, 'data', 'orders');

        // Escuchar Productos
        const unsubProducts = onSnapshot(productsRef, (snapshot) => {
            const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(prods);
            setLoading(false);
        }, (error) => console.error("Error cargando productos:", error));

        // Escuchar Órdenes (Solo cargamos si somos admin para ahorrar lecturas, o todas para demo)
        // Para esta demo cargamos siempre para simplificar la lógica
        const unsubOrders = onSnapshot(ordersRef, (snapshot) => {
            const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            ords.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setOrders(ords);
        }, (error) => console.error("Error cargando órdenes:", error));

        return () => {
            unsubProducts();
            unsubOrders();
        };
    }, [user]);

    // --- FUNCIONES DE CARRITO ---
    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { ...product, qty: 1 }];
        });
        showNotification(`Agregado: ${product.name}`);
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQty = (productId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => total + (item.price * item.qty), 0);
    }, [cart]);

    const clearCart = () => setCart([]);

    // --- FUNCIONES ADMIN ---
    const handleAdminLogin = (password) => {
        // CAMBIA ESTA CONTRASEÑA ANTES DE SUBIR A PRODUCCIÓN
        if (password === 'admin123') {
            setIsAdmin(true);
            localStorage.setItem('isAdminAuthenticated', 'true');
            setView('admin-dashboard');
            showNotification("Bienvenido Administrador", "success");
        } else {
            showNotification("Contraseña incorrecta", "error");
        }
    };

    const handleLogoutAdmin = () => {
        setIsAdmin(false);
        localStorage.removeItem('isAdminAuthenticated');
        setView('store');
    };

    // --- NOTIFICACIONES ---
    const showNotification = (msg, type = 'info') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
    };

    if (loading && user) return <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-600">Cargando tienda...</div>;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center cursor-pointer" onClick={() => setView('store')}>
                            <Store className="h-8 w-8 text-indigo-600 mr-2" />
                            <span className="font-bold text-xl tracking-tight text-gray-900">MiTienda<span className="text-indigo-600">.com</span></span>
                        </div>

                        <div className="flex items-center space-x-4">
                            {!isAdmin && (
                                <button
                                    onClick={() => setView('cart')}
                                    className="relative p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                                >
                                    <ShoppingCart className="h-6 w-6" />
                                    {cart.length > 0 && (
                                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
                                            {cart.reduce((a, c) => a + c.qty, 0)}
                                        </span>
                                    )}
                                </button>
                            )}

                            {isAdmin ? (
                                <button
                                    onClick={handleLogoutAdmin}
                                    className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                                >
                                    <LogOut className="h-4 w-4 mr-2" /> Salir Admin
                                </button>
                            ) : (
                                <button
                                    onClick={() => setView('admin-login')}
                                    className="text-sm font-medium text-gray-500 hover:text-gray-900"
                                >
                                    Admin
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {notification && (
                    <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white transform transition-all duration-500 flex items-center z-50 ${notification.type === 'error' ? 'bg-red-500' : 'bg-indigo-600'}`}>
                        {notification.type === 'error' ? <AlertCircle className="w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                        {notification.msg}
                    </div>
                )}

                {view === 'store' && (
                    <StoreFront products={products} addToCart={addToCart} />
                )}

                {view === 'cart' && (
                    <CartView
                        cart={cart}
                        total={cartTotal}
                        updateQty={updateQty}
                        removeFromCart={removeFromCart}
                        onCheckout={() => setView('checkout')}
                        onBack={() => setView('store')}
                    />
                )}

                {view === 'checkout' && (
                    <CheckoutView
                        cart={cart}
                        total={cartTotal}
                        clearCart={clearCart}
                        setView={setView}
                        user={user}
                        showNotification={showNotification}
                    />
                )}

                {view === 'admin-login' && (
                    <AdminLogin onLogin={handleAdminLogin} onCancel={() => setView('store')} />
                )}

                {view === 'admin-dashboard' && isAdmin && (
                    <AdminDashboard
                        products={products}
                        orders={orders}
                        showNotification={showNotification}
                        user={user}
                    />
                )}
            </main>
        </div>
    );
}

// --- SUB-COMPONENTES DE LA TIENDA ---

function StoreFront({ products, addToCart }) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="bg-indigo-600 rounded-2xl p-8 sm:p-12 text-center text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">Bienvenido a nuestra tienda</h1>
                    <p className="text-indigo-100 text-lg mb-6">Explora nuestros productos destacados.</p>
                </div>
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-indigo-900 opacity-20 rounded-full blur-2xl"></div>
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Catálogo</h2>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-64 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
            </div>

            {products.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">No hay productos disponibles.</p>
                    <p className="text-sm text-gray-400">Accede como Admin para agregar el primero.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100 flex flex-col">
                            <div className="h-48 w-full bg-gray-100 relative overflow-hidden group">
                                <img
                                    src={product.imageUrl || "https://placehold.co/400x300?text=Producto"}
                                    alt={product.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=Producto' }}
                                />
                                {product.stock <= 0 && (
                                    <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center">
                                        <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Agotado</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 text-lg mb-1">{product.name}</h3>
                                    <p className="text-gray-500 text-sm line-clamp-2 mb-3">{product.description}</p>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <span className="text-xl font-bold text-indigo-600">${parseFloat(product.price).toFixed(2)}</span>
                                    <button
                                        onClick={() => addToCart(product)}
                                        disabled={product.stock <= 0}
                                        className={`p-2 rounded-full transition-colors ${product.stock > 0 ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                    >
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CartView({ cart, total, updateQty, removeFromCart, onCheckout, onBack }) {
    return (
        <div className="max-w-4xl mx-auto">
            <button onClick={onBack} className="mb-6 flex items-center text-gray-500 hover:text-indigo-600">
                <ChevronRight className="h-4 w-4 rotate-180 mr-1" /> Seguir comprando
            </button>

            <h2 className="text-3xl font-bold mb-8 flex items-center">
                <ShoppingCart className="mr-3 h-8 w-8 text-indigo-600" /> Tu Carrito
            </h2>

            {cart.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-100">
                    <div className="inline-block p-4 bg-gray-50 rounded-full mb-4">
                        <ShoppingCart className="h-12 w-12 text-gray-300" />
                    </div>
                    <p className="text-gray-500 text-lg mb-6">Tu carrito está vacío.</p>
                    <button onClick={onBack} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                        Ir a la tienda
                    </button>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <ul className="divide-y divide-gray-100">
                            {cart.map(item => (
                                <li key={item.id} className="p-6 flex items-center gap-6">
                                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                                        <img
                                            src={item.imageUrl || "https://placehold.co/100"}
                                            alt={item.name}
                                            className="h-full w-full object-cover object-center"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <div className="flex justify-between text-base font-medium text-gray-900">
                                            <h3>{item.name}</h3>
                                            <p className="ml-4">${(item.price * item.qty).toFixed(2)}</p>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-500">${item.price} c/u</p>
                                        <div className="flex flex-1 items-end justify-between text-sm">
                                            <div className="flex items-center border border-gray-300 rounded-md">
                                                <button onClick={() => updateQty(item.id, -1)} className="px-3 py-1 hover:bg-gray-100">-</button>
                                                <span className="px-2 font-medium text-gray-900">{item.qty}</span>
                                                <button onClick={() => updateQty(item.id, 1)} className="px-3 py-1 hover:bg-gray-100">+</button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFromCart(item.id)}
                                                className="font-medium text-red-500 hover:text-red-700 flex items-center"
                                            >
                                                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="lg:w-80 h-fit bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen</h3>
                        <div className="flow-root">
                            <dl className="-my-4 divide-y divide-gray-100">
                                <div className="flex items-center justify-between py-4">
                                    <dt className="text-sm text-gray-600">Subtotal</dt>
                                    <dd className="text-sm font-medium text-gray-900">${total.toFixed(2)}</dd>
                                </div>
                                <div className="flex items-center justify-between py-4 border-t border-gray-200">
                                    <dt className="text-base font-bold text-gray-900">Total</dt>
                                    <dd className="text-xl font-bold text-indigo-600">${total.toFixed(2)}</dd>
                                </div>
                            </dl>
                        </div>
                        <div className="mt-6">
                            <button
                                onClick={onCheckout}
                                className="w-full bg-indigo-600 border border-transparent rounded-lg shadow-sm py-3 px-4 text-base font-medium text-white hover:bg-indigo-700 flex justify-center items-center"
                            >
                                Checkout <ChevronRight className="h-4 w-4 ml-2" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CheckoutView({ cart, total, clearCart, setView, user, showNotification }) {
    const [formData, setFormData] = useState({ name: '', address: '', email: '', phone: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            showNotification("Error: No hay conexión con la base de datos", "error");
            return;
        }

        setIsSubmitting(true);

        try {
            const orderData = {
                items: cart,
                total: total,
                customer: formData,
                status: 'pending',
                createdAt: serverTimestamp(),
                userId: user.uid
            };

            await addDoc(collection(db, COLLECTION_NAME, 'data', 'orders'), orderData);

            clearCart();
            showNotification("¡Orden recibida con éxito!", "success");
            setView('store');
        } catch (error) {
            console.error("Error al crear orden:", error);
            showNotification("Error al procesar la orden.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <CreditCard className="mr-2 text-indigo-600" /> Finalizar Compra
                </h2>
                <span className="text-indigo-600 font-bold text-lg">${total.toFixed(2)}</span>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Nombre Completo</label>
                        <input required type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input required type="email" className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Dirección</label>
                    <input required type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setView('cart')} className="w-1/3 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="w-2/3 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-70">
                        {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function AdminLogin({ onLogin, onCancel }) {
    const [pass, setPass] = useState('');

    return (
        <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
            <div className="text-center mb-6">
                <div className="bg-indigo-100 p-3 rounded-full inline-block mb-3">
                    <Users className="h-8 w-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Acceso Admin</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); onLogin(pass); }}>
                <input type="password" autoFocus className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-6"
                    placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} />
                <div className="flex gap-3">
                    <button type="button" onClick={onCancel} className="w-1/2 bg-gray-100 text-gray-700 py-2 rounded-lg">Cancelar</button>
                    <button type="submit" className="w-1/2 bg-indigo-600 text-white py-2 rounded-lg font-medium">Entrar</button>
                </div>
            </form>
        </div>
    );
}

function AdminDashboard({ products, orders, showNotification }) {
    const [tab, setTab] = useState('inventory');

    const totalSales = orders.reduce((acc, order) => acc + (order.total || 0), 0);
    const totalOrders = orders.length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <div className="flex bg-white p-1 rounded-lg shadow-sm border border-gray-200">
                    <button onClick={() => setTab('inventory')} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'inventory' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>Inventario</button>
                    <button onClick={() => setTab('orders')} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'orders' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>Órdenes</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 bg-green-100 rounded-lg mr-4 text-green-600"><TrendingUp /></div>
                    <div><p className="text-sm text-gray-500">Ventas</p><p className="text-2xl font-bold text-gray-900">${totalSales.toFixed(2)}</p></div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg mr-4 text-blue-600"><Package /></div>
                    <div><p className="text-sm text-gray-500">Pedidos</p><p className="text-2xl font-bold text-gray-900">{totalOrders}</p></div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
                {tab === 'inventory' ? (
                    <InventoryManager products={products} showNotification={showNotification} />
                ) : (
                    <OrdersManager orders={orders} showNotification={showNotification} />
                )}
            </div>
        </div>
    );
}

function InventoryManager({ products, showNotification }) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [formData, setFormData] = useState({ name: '', price: '', stock: '', description: '', imageUrl: '', category: '' });

    const handleEdit = (prod) => {
        setCurrentProduct(prod);
        setFormData(prod);
        setIsEditing(true);
    };

    const handleCreate = () => {
        setCurrentProduct(null);
        setFormData({ name: '', price: '', stock: '', description: '', imageUrl: '', category: '' });
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Borrar producto?')) {
            try {
                await deleteDoc(doc(db, COLLECTION_NAME, 'data', 'products', id));
                showNotification("Producto eliminado", "success");
            } catch (e) {
                showNotification("Error al eliminar", "error");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const dataToSave = {
            ...formData,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock),
            updatedAt: serverTimestamp()
        };

        try {
            const collectionRef = collection(db, COLLECTION_NAME, 'data', 'products');
            if (currentProduct) {
                await updateDoc(doc(db, COLLECTION_NAME, 'data', 'products', currentProduct.id), dataToSave);
                showNotification("Actualizado", "success");
            } else {
                await addDoc(collectionRef, { ...dataToSave, createdAt: serverTimestamp() });
                showNotification("Creado", "success");
            }
            setIsEditing(false);
        } catch (e) {
            console.error(e);
            showNotification("Error al guardar", "error");
        }
    };

    if (isEditing) {
        return (
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">{currentProduct ? 'Editar' : 'Nuevo'}</h3>
                    <button onClick={() => setIsEditing(false)} className="text-gray-500"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
                    <div className="grid grid-cols-2 gap-4">
                        <input required className="border p-2 rounded" placeholder="Nombre" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        <input className="border p-2 rounded" placeholder="Categoría" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                        <input required type="number" step="0.01" className="border p-2 rounded" placeholder="Precio" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                        <input required type="number" className="border p-2 rounded" placeholder="Stock" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
                    </div>
                    <input required className="w-full border p-2 rounded" placeholder="URL Imagen" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} />
                    <textarea className="w-full border p-2 rounded" rows="3" placeholder="Descripción" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Guardar</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 bg-gray-50 flex justify-between">
                <h3 className="font-semibold">Productos</h3>
                <button onClick={handleCreate} className="bg-indigo-600 text-white px-3 py-2 rounded text-sm flex items-center"><Plus className="h-4 w-4 mr-1" /> Nuevo</button>
            </div>
            <div className="overflow-auto flex-1">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {products.map(product => (
                            <tr key={product.id}>
                                <td className="px-6 py-4 flex items-center">
                                    <img className="h-10 w-10 rounded-full object-cover mr-3" src={product.imageUrl} onError={(e) => e.target.src = 'https://placehold.co/50'} />
                                    <div><div className="font-medium text-gray-900">{product.name}</div><div className="text-sm text-gray-500">{product.stock} en stock</div></div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">${product.price}</td>
                                <td className="px-6 py-4 text-right text-sm font-medium">
                                    <button onClick={() => handleEdit(product)} className="text-indigo-600 mr-4"><Edit className="h-4 w-4" /></button>
                                    <button onClick={() => handleDelete(product.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function OrdersManager({ orders, showNotification }) {
    const updateStatus = async (orderId, newStatus) => {
        try {
            await updateDoc(doc(db, COLLECTION_NAME, 'data', 'orders', orderId), { status: newStatus });
            showNotification("Estado actualizado", "success");
        } catch (e) { showNotification("Error", "error"); }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 bg-gray-50"><h3 className="font-semibold">Historial</h3></div>
            <div className="overflow-auto flex-1">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID / Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td className="px-6 py-4 text-sm">
                                    <span className="font-mono text-xs block">{order.id.slice(0, 8)}</span>
                                    <span className="text-gray-900 font-medium">{order.customer?.name}</span>
                                </td>
                                <td className="px-6 py-4 text-sm font-bold">${order.total?.toFixed(2)}</td>
                                <td className="px-6 py-4 text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-sm">
                                    {order.status === 'pending' && <button onClick={() => updateStatus(order.id, 'shipped')} className="text-blue-600 border border-blue-200 rounded px-2 py-1 text-xs">Enviar</button>}
                                    {order.status === 'shipped' && <button onClick={() => updateStatus(order.id, 'delivered')} className="text-green-600 border border-green-200 rounded px-2 py-1 text-xs">Entregar</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}