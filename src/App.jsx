import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Package, Users, TrendingUp, Plus, Trash2, Edit, X, 
  Menu, Search, LogOut, ChevronRight, Store, CreditCard, CheckCircle, 
  AlertCircle, LayoutDashboard
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
const firebaseConfig = {

  apiKey: "AIzaSyBpRGVRQZztDseOlTlmFSEGY2ur84_uEnI",

  authDomain: "pixelstore-dfba1.firebaseapp.com",

  projectId: "pixelstore-dfba1",

  storageBucket: "pixelstore-dfba1.firebasestorage.app",

  messagingSenderId: "826051147714",

  appId: "1:826051147714:web:2378fb1ee7cda036d4c85b"

};

// Nombre de la colección principal
const COLLECTION_NAME = "tienda_guatemala_v1";

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
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Falta Configuración</h1>
          <p className="text-gray-600 mb-6">
            Necesitas pegar tus credenciales de Firebase en el archivo <code>src/App.jsx</code>.
          </p>
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
    signInAnonymously(auth).catch((error) => console.error("Error auth:", error));
    
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const adminSession = localStorage.getItem('isAdminAuthenticated');
      if (adminSession === 'true') setIsAdmin(true);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const productsRef = collection(db, COLLECTION_NAME, 'data', 'products');
    const ordersRef = collection(db, COLLECTION_NAME, 'data', 'orders');

    const unsubProducts = onSnapshot(productsRef, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      setLoading(false);
    }, (error) => console.error("Error productos:", error));

    const unsubOrders = onSnapshot(ordersRef, (snapshot) => {
      const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      ords.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(ords);
    }, (error) => console.error("Error órdenes:", error));

    return () => {
      unsubProducts();
      unsubOrders();
    };
  }, [user]);

  // --- FUNCIONES CARRITO ---
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
    if (password === 'admin123') { // CAMBIAR ESTO
      setIsAdmin(true);
      localStorage.setItem('isAdminAuthenticated', 'true');
      setView('admin-dashboard');
      showNotification("Bienvenido Admin", "success");
    } else {
      showNotification("Contraseña incorrecta", "error");
    }
  };

  const handleLogoutAdmin = () => {
    setIsAdmin(false);
    localStorage.removeItem('isAdminAuthenticated');
    setView('store');
  };

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
              <span className="font-bold text-xl tracking-tight text-gray-900">Tienda<span className="text-indigo-600">GT</span></span>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
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
                <>
                  {/* Botón para regresar al Dashboard si estás navegando en la tienda */}
                  {view !== 'admin-dashboard' && (
                    <button 
                      onClick={() => setView('admin-dashboard')}
                      className="flex items-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
                    >
                      <LayoutDashboard className="h-4 w-4 mr-1" /> Panel Admin
                    </button>
                  )}
                  <button 
                    onClick={handleLogoutAdmin}
                    className="flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                  >
                    <LogOut className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Salir</span>
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setView('admin-login')}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900 px-2"
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

        {view === 'store' && <StoreFront products={products} addToCart={addToCart} />}
        {view === 'cart' && <CartView cart={cart} total={cartTotal} updateQty={updateQty} removeFromCart={removeFromCart} onCheckout={() => setView('checkout')} onBack={() => setView('store')} />}
        {view === 'checkout' && <CheckoutView cart={cart} total={cartTotal} clearCart={clearCart} setView={setView} user={user} showNotification={showNotification} />}
        {view === 'admin-login' && <AdminLogin onLogin={handleAdminLogin} onCancel={() => setView('store')} />}
        {view === 'admin-dashboard' && isAdmin && <AdminDashboard products={products} orders={orders} showNotification={showNotification} user={user} />}
      </main>
    </div>
  );
}

// --- SUB-COMPONENTES TIENDA ---

function StoreFront({ products, addToCart }) {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-center text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Productos Destacados</h1>
        <p className="text-indigo-100">Calidad y buen precio en un solo lugar.</p>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-gray-800">Catálogo</h2>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-48 sm:w-64 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay productos disponibles aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden border border-gray-100">
              <div className="h-48 w-full bg-gray-100 relative">
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {e.target.src = 'https://placehold.co/400x300?text=Sin+Imagen'}}
                />
                {product.stock <= 0 && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">AGOTADO</span>
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
                <p className="text-gray-500 text-xs mb-3 flex-1">{product.description?.substring(0, 60)}...</p>
                <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                  <span className="text-lg font-bold text-indigo-600">Q{parseFloat(product.price).toFixed(2)}</span>
                  <button 
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                    className={`p-2 rounded-lg transition-colors ${product.stock > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-400'}`}
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
      <button onClick={onBack} className="mb-6 flex items-center text-gray-500 hover:text-indigo-600 text-sm">
        <ChevronRight className="h-4 w-4 rotate-180 mr-1" /> Regresar
      </button>
      <h2 className="text-2xl font-bold mb-6 flex items-center"><ShoppingCart className="mr-2 h-6 w-6" /> Carrito de Compras</h2>

      {cart.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 mb-4">El carrito está vacío.</p>
          <button onClick={onBack} className="text-indigo-600 font-medium hover:underline">Ver productos</button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {cart.map(item => (
              <div key={item.id} className="p-4 flex items-center gap-4 border-b border-gray-100 last:border-0">
                <img src={item.imageUrl} className="h-16 w-16 rounded object-cover bg-gray-100" onError={(e) => e.target.src='https://placehold.co/50'} />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">Q{item.price} c/u</p>
                </div>
                <div className="flex items-center border rounded">
                  <button onClick={() => updateQty(item.id, -1)} className="px-2 py-1 hover:bg-gray-100 text-gray-600">-</button>
                  <span className="px-2 text-sm font-medium">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="px-2 py-1 hover:bg-gray-100 text-gray-600">+</button>
                </div>
                <div className="text-right min-w-[80px]">
                   <p className="font-bold text-gray-900">Q{(item.price * item.qty).toFixed(2)}</p>
                   <button onClick={() => removeFromCart(item.id)} className="text-xs text-red-500 hover:text-red-700 mt-1">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:w-80 h-fit bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between py-2 text-lg font-bold">
              <span>Total</span>
              <span>Q{total.toFixed(2)}</span>
            </div>
            <button onClick={onCheckout} className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 flex justify-center items-center">
              Pagar Ahora <ChevronRight className="h-4 w-4 ml-1" />
            </button>
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
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, COLLECTION_NAME, 'data', 'orders'), {
        items: cart, total, customer: formData, status: 'pending', 
        createdAt: serverTimestamp(), userId: user?.uid || 'anon'
      });
      clearCart();
      showNotification("¡Pedido realizado con éxito!", "success");
      setView('store');
    } catch (error) {
      console.error(error);
      showNotification("Error al procesar pedido", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 p-8">
      <h2 className="text-xl font-bold mb-6">Datos de Envío</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required className="w-full border p-3 rounded-lg" placeholder="Nombre Completo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <input required type="email" className="w-full border p-3 rounded-lg" placeholder="Correo Electrónico" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        <input required className="w-full border p-3 rounded-lg" placeholder="Dirección Exacta" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
        <input required className="w-full border p-3 rounded-lg" placeholder="Teléfono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
        
        <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center mt-4">
          <span className="font-medium text-gray-700">Total a Pagar:</span>
          <span className="text-xl font-bold text-indigo-600">Q{total.toFixed(2)}</span>
        </div>

        <div className="flex gap-4 pt-2">
          <button type="button" onClick={() => setView('cart')} className="w-1/2 border py-3 rounded-lg">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="w-1/2 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
            {isSubmitting ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminDashboard({ products, orders, showNotification }) {
  const [tab, setTab] = useState('inventory');
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex bg-white p-1 rounded-lg border">
          <button onClick={() => setTab('inventory')} className={`px-4 py-2 rounded-md text-sm ${tab === 'inventory' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}>Inventario</button>
          <button onClick={() => setTab('orders')} className={`px-4 py-2 rounded-md text-sm ${tab === 'orders' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}>Pedidos</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
        {tab === 'inventory' ? 
          <InventoryManager products={products} showNotification={showNotification} /> : 
          <OrdersManager orders={orders} showNotification={showNotification} />
        }
      </div>
    </div>
  );
}

function InventoryManager({ products, showNotification }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
    if (window.confirm('¿Eliminar producto permanentemente?')) {
      try {
        await deleteDoc(doc(db, COLLECTION_NAME, 'data', 'products', id));
        showNotification("Producto eliminado", "success");
      } catch (e) { showNotification("Error al eliminar", "error"); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true); // Bloquear botón para evitar doble click

    // Validación segura de números
    const safePrice = formData.price ? parseFloat(formData.price) : 0;
    const safeStock = formData.stock ? parseInt(formData.stock) : 0;

    const dataToSave = {
        name: formData.name,
        category: formData.category,
        price: safePrice,
        stock: safeStock,
        description: formData.description,
        imageUrl: formData.imageUrl,
        updatedAt: serverTimestamp()
    };

    try {
        const collectionRef = collection(db, COLLECTION_NAME, 'data', 'products');
        if (currentProduct) {
            await updateDoc(doc(db, COLLECTION_NAME, 'data', 'products', currentProduct.id), dataToSave);
            showNotification("Producto actualizado correctamente", "success");
        } else {
            await addDoc(collectionRef, { ...dataToSave, createdAt: serverTimestamp() });
            showNotification("Producto creado exitosamente", "success");
        }
        setIsEditing(false);
    } catch (e) {
        console.error("Error guardando:", e);
        showNotification("Hubo un error al guardar. Revisa la consola.", "error");
    } finally {
        setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">{currentProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-800"><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Nombre</label>
                  <input required className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Categoría</label>
                  <input className="w-full border p-2 rounded" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Precio (Q)</label>
                  <input required type="number" step="0.01" className="w-full border p-2 rounded" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Stock</label>
                  <input required type="number" className="w-full border p-2 rounded" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">URL Imagen</label>
              <input required className="w-full border p-2 rounded" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} placeholder="https://ejemplo.com/foto.jpg" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Descripción</label>
              <textarea className="w-full border p-2 rounded" rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
            </div>
            <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded hover:bg-gray-50" disabled={isSaving}>Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-400" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar Producto'}
                </button>
            </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-gray-50 border-b flex justify-between">
        <h3 className="font-semibold text-gray-700">Inventario Actual</h3>
        <button onClick={handleCreate} className="bg-indigo-600 text-white px-3 py-2 rounded text-sm flex items-center hover:bg-indigo-700"><Plus className="h-4 w-4 mr-1" /> Agregar</button>
      </div>
      <div className="overflow-auto flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {products.map(product => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 flex items-center">
                    <div className="h-10 w-10 rounded bg-gray-100 mr-3 overflow-hidden">
                        <img className="h-full w-full object-cover" src={product.imageUrl} onError={(e) => e.target.src = 'https://placehold.co/50'} />
                    </div>
                    <div><div className="font-medium text-gray-900">{product.name}</div><div className={`text-xs ${product.stock < 5 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>{product.stock} unidades</div></div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">Q{product.price}</td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <button onClick={() => handleEdit(product)} className="text-indigo-600 mr-3 hover:underline">Editar</button>
                  <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:underline">Borrar</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan="3" className="text-center py-10 text-gray-400">No hay productos. Agrega el primero.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrdersManager({ orders, showNotification }) {
  const updateStatus = async (id, status) => {
    try {
        await updateDoc(doc(db, COLLECTION_NAME, 'data', 'orders', id), { status });
        showNotification("Estado actualizado", "success");
    } catch (e) { showNotification("Error actualizando", "error"); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-gray-50 border-b"><h3 className="font-semibold text-gray-700">Pedidos Recientes</h3></div>
      <div className="overflow-auto flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gestión</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">
                  <div className="font-bold text-gray-900">{order.customer?.name}</div>
                  <div className="text-xs text-gray-500">{order.customer?.phone}</div>
                  <div className="text-xs text-gray-400 mt-1">{order.items?.length} productos</div>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-indigo-600">Q{order.total?.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : order.status === 'shipped' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {order.status === 'pending' ? 'Pendiente' : order.status === 'shipped' ? 'Enviado' : 'Entregado'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm space-x-2">
                    {order.status === 'pending' && <button onClick={() => updateStatus(order.id, 'shipped')} className="bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100">Enviar</button>}
                    {order.status === 'shipped' && <button onClick={() => updateStatus(order.id, 'delivered')} className="bg-green-50 text-green-600 px-2 py-1 rounded border border-green-200 hover:bg-green-100">Entregar</button>}
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan="4" className="text-center py-10 text-gray-400">No hay pedidos pendientes.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminLogin({ onLogin, onCancel }) {
  const [pass, setPass] = useState('');
  return (
    <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
      <div className="bg-indigo-100 p-3 rounded-full inline-block mb-4"><Users className="h-8 w-8 text-indigo-600" /></div>
      <h2 className="text-2xl font-bold mb-6">Acceso Administrativo</h2>
      <form onSubmit={(e) => { e.preventDefault(); onLogin(pass); }}>
        <input type="password" autoFocus className="w-full border p-3 rounded-lg mb-4" placeholder="Contraseña de Admin" value={pass} onChange={e => setPass(e.target.value)} />
        <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="w-1/2 py-2 rounded-lg border hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="w-1/2 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">Entrar</button>
        </div>
      </form>
    </div>
  );
}