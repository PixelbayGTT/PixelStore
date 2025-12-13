import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Package, Users, TrendingUp, Plus, Trash2, Edit, X, 
  Menu, Search, LogOut, ChevronRight, Store, CreditCard, CheckCircle, 
  AlertCircle, LayoutDashboard, Smartphone, Mail, Info, ArrowLeft
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, 
  updateDoc, serverTimestamp, writeBatch, increment 
} from 'firebase/firestore';

// ==========================================
// ⚠️ ZONA DE CONFIGURACIÓN OBLIGATORIA ⚠️
// ==========================================
const firebaseConfig = {

  apiKey: "AIzaSyBpRGVRQZztDseOlTlmFSEGY2ur84_uEnI",

  authDomain: "pixelstore-dfba1.firebaseapp.com",

  projectId: "pixelstore-dfba1",

  storageBucket: "pixelstore-dfba1.firebasestorage.app",

  messagingSenderId: "826051147714",

  appId: "1:826051147714:web:2378fb1ee7cda036d4c85b"

};

// Nombre de la colección principal
const COLLECTION_NAME = "tienda_digital_gt_v2";

// ==========================================
// INICIALIZACIÓN
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
            Pega tus credenciales de Firebase en <code>src/App.jsx</code>.
          </p>
        </div>
      </div>
    );
  }

  const [user, setUser] = useState(null);
  const [view, setView] = useState('store');
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notification, setNotification] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null); // Estado para producto seleccionado

  // --- AUTENTICACIÓN Y CARGA DE DATOS ---
  useEffect(() => {
    signInAnonymously(auth).catch((error) => console.error("Auth Error:", error));
    
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const adminSession = localStorage.getItem('isAdminAuthenticated');
      if (adminSession === 'true') setIsAdmin(true);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || !db) return;

    const productsRef = collection(db, COLLECTION_NAME, 'data', 'products');
    const ordersRef = collection(db, COLLECTION_NAME, 'data', 'orders');

    const unsubProducts = onSnapshot(productsRef, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      setLoading(false);
    }, (e) => console.error(e));

    const unsubOrders = onSnapshot(ordersRef, (snapshot) => {
      const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      ords.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(ords);
    }, (e) => console.error(e));

    return () => { unsubProducts(); unsubOrders(); };
  }, [user]);

  // --- FUNCIONES CARRITO ---
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
            showNotification("No hay más stock disponible", "error");
            return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    showNotification(`Agregado: ${product.name}`);
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(item => item.id !== productId));

  const updateQty = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        // Encontrar producto real para checar stock maximo
        const realProduct = products.find(p => p.id === productId);
        const maxStock = realProduct ? realProduct.stock : 99;
        
        const newQty = item.qty + delta;
        if (newQty > maxStock) {
            showNotification("Stock máximo alcanzado", "error");
            return item;
        }
        return { ...item, qty: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setView('product-details');
  };

  const cartTotal = useMemo(() => cart.reduce((t, i) => t + (i.price * i.qty), 0), [cart]);
  const clearCart = () => setCart([]);

  // --- NOTIFICACIONES ---
  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000); 
  };

  // --- RENDER ---
  if (loading && user) return <div className="flex h-screen items-center justify-center text-gray-600">Cargando sistema...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center cursor-pointer" onClick={() => setView('store')}>
              <Store className="h-8 w-8 text-indigo-600 mr-2" />
              <span className="font-bold text-xl tracking-tight text-gray-900">Pixel<span className="text-indigo-600">Shop</span></span>
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
                  {view !== 'admin-dashboard' && (
                    <button onClick={() => setView('admin-dashboard')} className="flex items-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100">
                      <LayoutDashboard className="h-4 w-4 mr-1" /> Panel
                    </button>
                  )}
                  <button onClick={() => { setIsAdmin(false); localStorage.removeItem('isAdminAuthenticated'); setView('store'); }} className="flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100">
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button onClick={() => setView('admin-login')} className="text-sm font-medium text-gray-500 hover:text-gray-900 px-2">Admin</button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {notification && (
          <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-lg shadow-xl text-white transform transition-all duration-500 flex items-center z-50 ${notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
            {notification.type === 'error' ? <AlertCircle className="w-6 h-6 mr-3" /> : <CheckCircle className="w-6 h-6 mr-3" />}
            <span className="font-medium">{notification.msg}</span>
          </div>
        )}

        {view === 'store' && <StoreFront products={products} addToCart={addToCart} onProductClick={handleProductClick} />}
        {view === 'product-details' && <ProductDetails product={selectedProduct} addToCart={addToCart} onBack={() => setView('store')} />}
        {view === 'cart' && <CartView cart={cart} total={cartTotal} updateQty={updateQty} removeFromCart={removeFromCart} onCheckout={() => setView('checkout')} onBack={() => setView('store')} />}
        {view === 'checkout' && <CheckoutView cart={cart} total={cartTotal} clearCart={clearCart} setView={setView} user={user} showNotification={showNotification} />}
        {view === 'admin-login' && <AdminLogin onLogin={(p) => { if(p==='PixelTheBest#1!'){setIsAdmin(true);localStorage.setItem('isAdminAuthenticated','true');setView('admin-dashboard');showNotification("Bienvenido","success")}else{showNotification("Error","error")} }} onCancel={() => setView('store')} />}
        {view === 'admin-dashboard' && isAdmin && <AdminDashboard products={products} orders={orders} showNotification={showNotification} user={user} />}
      </main>
    </div>
  );
}

// --- TIENDA ---
function StoreFront({ products, addToCart, onProductClick }) {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-gray-900 to-indigo-900 rounded-2xl p-8 text-center text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Productos Digitales Premium</h1>
        <p className="text-indigo-200">Entrega inmediata y segura.</p>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-gray-800">Catálogo</h2>
        <div className="relative">
          <input type="text" placeholder="Buscar..." className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-48 sm:w-64 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay productos disponibles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden border border-gray-100 group">
              <div className="h-48 w-full bg-gray-100 relative overflow-hidden cursor-pointer" onClick={() => onProductClick(product)}>
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => {e.target.src = 'https://placehold.co/400x300?text=Digital'}} />
                {product.stock <= 0 && <div className="absolute inset-0 bg-white/90 flex items-center justify-center"><span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">AGOTADO</span></div>}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 mb-1 cursor-pointer hover:text-indigo-600" onClick={() => onProductClick(product)}>{product.name}</h3>
                <p className="text-gray-500 text-xs mb-3 flex-1">{product.description?.substring(0, 60)}...</p>
                <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                  <span className="text-lg font-bold text-indigo-600">Q{parseFloat(product.price).toFixed(2)}</span>
                  <button onClick={() => addToCart(product)} disabled={product.stock <= 0} className={`p-2 rounded-lg transition-colors ${product.stock > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
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

// --- DETALLE DEL PRODUCTO ---
function ProductDetails({ product, addToCart, onBack }) {
  if (!product) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={onBack} className="mb-6 flex items-center text-gray-500 hover:text-indigo-600 text-sm font-medium">
        <ArrowLeft className="h-4 w-4 mr-2" /> Regresar al catálogo
      </button>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        {/* Imagen */}
        <div className="md:w-1/2 bg-gray-100 relative min-h-[300px] md:min-h-[500px]">
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {e.target.src = 'https://placehold.co/600x600?text=Digital'}}
          />
          {product.stock <= 0 && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <span className="bg-red-600 text-white text-lg font-bold px-6 py-2 rounded-full transform -rotate-12 shadow-xl">AGOTADO</span>
            </div>
          )}
        </div>

        {/* Información */}
        <div className="p-8 md:p-12 md:w-1/2 flex flex-col">
          <div className="flex justify-between items-start mb-4">
             <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-3 uppercase tracking-wider">
                  {product.category || 'Digital'}
                </span>
                <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">{product.name}</h1>
             </div>
             <div className="text-right">
                <span className="block text-2xl font-bold text-indigo-600">Q{parseFloat(product.price).toFixed(2)}</span>
             </div>
          </div>

          <div className="prose prose-indigo text-gray-600 mb-8 flex-1 overflow-y-auto max-h-[300px] pr-2">
            <p className="whitespace-pre-line leading-relaxed">{product.description}</p>
          </div>

          <div className="pt-6 border-t border-gray-100 mt-auto">
            <div className="flex items-center justify-between mb-6">
                <span className={`text-sm font-medium flex items-center ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {product.stock > 0 ? (
                        <><CheckCircle className="w-4 h-4 mr-1.5" /> Disponible: {product.stock}</>
                    ) : (
                        <><AlertCircle className="w-4 h-4 mr-1.5" /> Sin Stock</>
                    )}
                </span>
            </div>
            
            <button 
                onClick={() => addToCart(product)} 
                disabled={product.stock <= 0}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg transform transition-all active:scale-95 ${
                    product.stock > 0 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                }`}
            >
                {product.stock > 0 ? 'Agregar al Carrito' : 'No disponible'}
            </button>
          </div>
        </div>
      </div>
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
              Proceder al Pago <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- CHECKOUT ACTUALIZADO ---
function CheckoutView({ cart, total, clearCart, setView, user, showNotification }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Usar Batch para crear orden Y descontar stock atómicamente
      const batch = writeBatch(db);

      // 1. Crear referencia de nueva orden
      const newOrderRef = doc(collection(db, COLLECTION_NAME, 'data', 'orders'));
      batch.set(newOrderRef, {
        items: cart,
        total,
        customer: formData,
        status: 'pending',
        createdAt: serverTimestamp(),
        userId: user?.uid || 'anon'
      });

      // 2. Descontar stock de cada producto
      cart.forEach(item => {
        const productRef = doc(db, COLLECTION_NAME, 'data', 'products', item.id);
        batch.update(productRef, {
            stock: increment(-item.qty)
        });
      });

      // 3. Ejecutar todo junto
      await batch.commit();

      clearCart();
      // Mensaje actualizado
      showNotification("Pedido registrado. Le contactaremos en un lapso de 6 horas.", "success");
      setView('store');

    } catch (error) {
      console.error(error);
      showNotification("Error procesando pedido. Intente nuevamente.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 p-8">
      <h2 className="text-xl font-bold mb-6 flex items-center text-gray-800">
        <CreditCard className="mr-2 text-indigo-600" /> Confirmar Pedido
      </h2>
      
      {/* Mensaje Informativo Profesional */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-6 flex items-start">
        <Info className="text-blue-600 w-5 h-5 mr-3 mt-1 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-bold mb-1">Información de Pago y Entrega</p>
          <p>
            Los pagos se realizan mediante <strong>Transferencia</strong> o <strong>Depósito Bancario</strong>. 
            Al confirmar su pedido, nuestros productos digitales serán reservados y un agente se comunicará con usted 
            al número proporcionado para coordinar el pago y el envío de sus archivos.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre Completo</label>
            <input required className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej. Juan Pérez" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
        <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Correo Electrónico (Para envío de productos)</label>
            <div className="relative">
                <input required type="email" className="w-full border p-3 pl-10 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="juan@ejemplo.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
            </div>
        </div>
        <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Número de Teléfono (WhatsApp)</label>
            <div className="relative">
                <input required className="w-full border p-3 pl-10 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="5555 1234" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                <Smartphone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
            </div>
        </div>
        
        <div className="flex justify-between items-center py-4 border-t mt-4">
          <span className="font-medium text-gray-700">Total a Pagar:</span>
          <span className="text-2xl font-bold text-indigo-600">Q{total.toFixed(2)}</span>
        </div>

        <div className="flex gap-4 pt-2">
          <button type="button" onClick={() => setView('cart')} className="w-1/2 border border-gray-300 py-3 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="w-1/2 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- ADMIN ---
function AdminDashboard({ products, orders, showNotification }) {
  const [tab, setTab] = useState('inventory');
  
  // Cálculos de estadísticas
  const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
                <Package className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">Stock Total</p>
                <p className="text-2xl font-bold text-gray-900">{totalStock} <span className="text-sm font-normal text-gray-400">unidades</span></p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg mr-4">
                <TrendingUp className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">Ventas Totales</p>
                <p className="text-2xl font-bold text-gray-900">Q{totalRevenue.toFixed(2)}</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center">
            <div className={`p-3 rounded-lg mr-4 ${pendingOrdersCount > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                <AlertCircle className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">Pedidos Pendientes</p>
                <p className={`text-2xl font-bold ${pendingOrdersCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{pendingOrdersCount}</p>
            </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Gestión</h1>
        <div className="flex bg-white p-1 rounded-lg border">
          <button onClick={() => setTab('inventory')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'inventory' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Inventario</button>
          <button onClick={() => setTab('orders')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'orders' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Pedidos</button>
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

  const handleEdit = (prod) => { setCurrentProduct(prod); setFormData(prod); setIsEditing(true); };
  const handleCreate = () => { setCurrentProduct(null); setFormData({ name: '', price: '', stock: '', description: '', imageUrl: '', category: '' }); setIsEditing(true); };
  const handleDelete = async (id) => { if (window.confirm('¿Borrar permanentemente?')) { try { await deleteDoc(doc(db, COLLECTION_NAME, 'data', 'products', id)); showNotification("Borrado", "success"); } catch (e) { showNotification("Error", "error"); } } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!db) return;
    setIsSaving(true); 
    const safePrice = formData.price && !isNaN(parseFloat(formData.price)) ? parseFloat(formData.price) : 0;
    const safeStock = formData.stock && !isNaN(parseInt(formData.stock)) ? parseInt(formData.stock) : 0;
    const dataToSave = { ...formData, price: safePrice, stock: safeStock, updatedAt: serverTimestamp() };

    try {
        const collectionRef = collection(db, COLLECTION_NAME, 'data', 'products');
        const savePromise = currentProduct ? updateDoc(doc(db, COLLECTION_NAME, 'data', 'products', currentProduct.id), dataToSave) : addDoc(collectionRef, { ...dataToSave, createdAt: serverTimestamp() });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));
        await Promise.race([savePromise, timeoutPromise]);
        showNotification("Guardado con éxito", "success");
        setIsEditing(false);
    } catch (e) { showNotification("Error al guardar", "error"); } finally { setIsSaving(false); }
  };

  if (isEditing) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">{currentProduct ? 'Editar' : 'Nuevo'}</h3>
            <button onClick={() => setIsEditing(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
                <input required className="w-full border p-2 rounded" placeholder="Nombre" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input className="w-full border p-2 rounded" placeholder="Categoría" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                <input required type="number" className="w-full border p-2 rounded" placeholder="Precio (Q)" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                <input required type="number" className="w-full border p-2 rounded" placeholder="Stock" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
            </div>
            <input required className="w-full border p-2 rounded" placeholder="URL Imagen" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
            <textarea className="w-full border p-2 rounded" rows="3" placeholder="Descripción" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
            <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded">Cancelar</button><button type="submit" disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white rounded">{isSaving ? '...' : 'Guardar'}</button></div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-gray-50 border-b flex justify-between"><h3 className="font-semibold text-gray-700">Inventario</h3><button onClick={handleCreate} className="bg-indigo-600 text-white px-3 py-2 rounded text-sm flex items-center hover:bg-indigo-700"><Plus className="h-4 w-4 mr-1" /> Agregar</button></div>
      <div className="overflow-auto flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white sticky top-0"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th></tr></thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {products.map(product => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 flex items-center"><img className="h-10 w-10 rounded bg-gray-100 mr-3 object-cover" src={product.imageUrl} onError={(e) => e.target.src = 'https://placehold.co/50'} /><div><div className="font-medium text-gray-900">{product.name}</div><div className={`text-xs ${product.stock < 5 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>{product.stock} disponibles</div></div></td>
                <td className="px-6 py-4 text-sm text-gray-900">Q{product.price}</td>
                <td className="px-6 py-4 text-right text-sm font-medium"><button onClick={() => handleEdit(product)} className="text-indigo-600 mr-3 hover:underline">Editar</button><button onClick={() => handleDelete(product.id)} className="text-red-600 hover:underline">Borrar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- ORDERS MANAGER CORREGIDO ---
function OrdersManager({ orders, showNotification }) {
  const updateStatus = async (id, status) => {
    try { await updateDoc(doc(db, COLLECTION_NAME, 'data', 'orders', id), { status }); showNotification("Actualizado", "success"); } catch (e) { showNotification("Error", "error"); }
  };

  // Función para eliminar pedidos
  const handleDeleteOrder = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este pedido permanentemente?')) {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, 'data', 'orders', id));
            showNotification("Pedido eliminado", "success");
        } catch (e) {
            console.error(e);
            showNotification("Error al eliminar pedido", "error");
        }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-gray-50 border-b"><h3 className="font-semibold text-gray-700">Pedidos</h3></div>
      <div className="overflow-auto flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Productos (Detalle)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50 align-top">
                <td className="px-6 py-4 text-sm">
                  <div className="font-bold text-gray-900">{order.customer?.name}</div>
                  <div className="text-xs text-gray-500">{order.customer?.phone}</div>
                  <div className="text-xs text-gray-400">{order.customer?.email}</div>
                  <div className="text-xs text-gray-400 mt-1 font-mono">{new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</div>
                </td>
                
                {/* COLUMNA DE DETALLE CORREGIDA */}
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {order.items?.map((item, index) => (
                        <div key={index} className="text-sm text-gray-700 flex items-start">
                            <span className="font-bold mr-2 text-indigo-600 bg-indigo-50 px-1.5 rounded">{item.qty}x</span>
                            <span>{item.name}</span>
                        </div>
                    ))}
                  </div>
                </td>

                <td className="px-6 py-4 text-sm font-bold text-indigo-600">Q{order.total?.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : order.status === 'shipped' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {order.status === 'pending' ? 'Pendiente Pago' : order.status === 'shipped' ? 'Enviado' : 'Completado'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm space-y-2">
                    {order.status === 'pending' && <button onClick={() => updateStatus(order.id, 'shipped')} className="block w-full text-center bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100 text-xs">Marcar Enviado</button>}
                    {order.status === 'shipped' && <button onClick={() => updateStatus(order.id, 'delivered')} className="block w-full text-center bg-green-50 text-green-600 px-2 py-1 rounded border border-green-200 hover:bg-green-100 text-xs">Finalizar</button>}
                    
                    {/* Botón de eliminar pedido */}
                    <button onClick={() => handleDeleteOrder(order.id)} className="block w-full text-center bg-red-50 text-red-600 px-2 py-1 rounded border border-red-200 hover:bg-red-100 text-xs flex items-center justify-center">
                        <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                    </button>
                </td>
              </tr>
            ))}
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
      <h2 className="text-2xl font-bold mb-6">Admin</h2>
      <form onSubmit={(e) => { e.preventDefault(); onLogin(pass); }}>
        <input type="password" autoFocus className="w-full border p-3 rounded-lg mb-4" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} />
        <div className="flex gap-3"><button type="button" onClick={onCancel} className="w-1/2 py-2 rounded-lg border hover:bg-gray-50">Cancelar</button><button type="submit" className="w-1/2 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">Entrar</button></div>
      </form>
    </div>
  );
}