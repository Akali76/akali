import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  ChefHat,
  QrCode,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  Utensils,
  Bell,
  X,
  ArrowRight,
  Clock,
  AlertCircle,
  Lock,
  Delete,
  Wifi,
  ShieldAlert,
  Info,
  Edit,
  Save,
  Image as ImageIcon,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  deleteDoc,
  setDoc,
} from "firebase/firestore";

// --- SENİN FIREBASE AYARLARIN ---
const firebaseConfig = {
  apiKey: "AIzaSyDnL8U0yFoe8p5n3wi5tpFIEZmTIYI-sYq8",
  authDomain: "nasreddin-34c5f.firebaseapp.com",
  projectId: "nasreddin-34c5f",
  storageBucket: "nasreddin-34c5f.firebasestorage.app",
  messagingSenderId: "368755682869",
  appId: "1:368755682869:web:520077e8649e1e0137cb7c",
  measurementId: "G-39RJXEYEFP",
};
// --------------------------------------------------------------------

// Firebase Başlatma
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase Başlatma Hatası:", error);
}

const ROOT_COLLECTION = "restoran_data";

// ŞİFRELER
const STAFF_PIN = "1234"; // Personel (Sipariş Takibi)
const ADMIN_PIN = "9999"; // Yönetici (Menü Düzenleme)

// Varsayılan Menü
const DEFAULT_MENU_ITEMS = [
  {
    id: 1,
    name: "Adana Kebap",
    category: "Ana Yemek",
    price: 220,
    description: "Közlenmiş biber ve domates ile",
    ingredients: "Zırh kıyma kuzu eti, kapya biber, pul biber, tuz.",
    calories: "360 kcal",
    image:
      "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: 2,
    name: "Lahmacun",
    category: "Ana Yemek",
    price: 60,
    description: "Taş fırında, bol yeşillik ile",
    ingredients: "Dana kıyma, soğan, sarımsak, maydanoz, domates.",
    calories: "180 kcal",
    image:
      "https://images.unsplash.com/photo-1626844131082-256783844137?auto=format&fit=crop&q=80&w=600",
  },
];

const CATEGORIES = ["Tümü", "Ana Yemek", "Salata", "İçecek", "Tatlı"];

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("landing");
  const [currentTable, setCurrentTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

  const [activeCategory, setActiveCategory] = useState("Tümü");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [selectedItem, setSelectedItem] = useState(null);
  const [authError, setAuthError] = useState(null);

  const [kitchenTab, setKitchenTab] = useState("orders");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState(false);
  const [kitchenNewItem, setKitchenNewItem] = useState({
    name: "",
    price: "",
    category: "Ana Yemek",
    description: "",
    ingredients: "",
    image: "",
  });

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState(false);

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth Error:", error);
        setAuthError(error.message);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setConnectionStatus("connected");
        setAuthError(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;

    try {
      const ordersRef = collection(db, ROOT_COLLECTION, "public", "orders");
      const unsubOrders = onSnapshot(
        ordersRef,
        (snapshot) => {
          const ordersData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setOrders(ordersData);
        },
        (error) => {
          console.log("Sipariş verisi hatası:", error);
          setAuthError("Veri okuma hatası: " + error.message);
        }
      );

      const menuRef = collection(db, ROOT_COLLECTION, "public", "menu_items");
      const unsubMenu = onSnapshot(
        menuRef,
        async (snapshot) => {
          if (snapshot.empty) {
            DEFAULT_MENU_ITEMS.forEach(async (item) => {
              await addDoc(menuRef, item);
            });
          } else {
            const menuData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setMenuItems(menuData);
          }
        },
        (error) => console.log("Menü verisi hatası:", error)
      );

      return () => {
        unsubOrders();
        unsubMenu();
      };
    } catch (e) {
      console.error("Snapshot hatası:", e);
    }
  }, [user]);

  useEffect(() => {
    const savedTable = localStorage.getItem("connectedTable");
    const params = new URLSearchParams(window.location.search);
    const urlTableId = params.get("masa");

    if (savedTable) {
      handleTableSelect(parseInt(savedTable), true);
    } else if (urlTableId) {
      handleTableSelect(parseInt(urlTableId));
    }

    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- HATA EKRANI ---
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border-2 border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-500 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Bağlantı Hatası
          </h1>
          <p className="text-gray-600 mb-6">Firebase bağlantısı kurulamadı.</p>

          <div className="bg-gray-100 p-4 rounded-lg text-left text-sm font-mono text-gray-700 overflow-x-auto mb-6">
            {authError}
          </div>
        </div>
      </div>
    );
  }

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleTableSelect = (tableId, isAutoConnect = false) => {
    localStorage.setItem("connectedTable", tableId);
    setCurrentTable(tableId);
    setView("menu");
    if (!isAutoConnect) showNotification(`Masa ${tableId} bağlandı.`);
  };

  const handleLogout = () => {
    if (window.confirm("Masadan ayrılmak istediğinize emin misiniz?")) {
      localStorage.removeItem("connectedTable");
      setCurrentTable(null);
      setCart([]);
      setView("landing");
      const url = new URL(window.location);
      url.searchParams.delete("masa");
      window.history.pushState({}, "", url);
    }
  };

  const handlePinClick = (number) => {
    if (pin.length < 4) {
      setPin((prev) => prev + number);
      setLoginError(false);
    }
  };

  const handlePinDelete = () => setPin((prev) => prev.slice(0, -1));

  const handleLogin = () => {
    if (pin === STAFF_PIN || pin === ADMIN_PIN) {
      setView("kitchen");
      setIsLoginOpen(false);
      setPin("");
      if (pin === ADMIN_PIN) {
        setIsAdminAuthenticated(true);
        setKitchenTab("admin");
      }
    } else {
      setLoginError(true);
      setPin("");
      showNotification("Hatalı Şifre!");
    }
  };

  const handleAdminPinClick = (num) => {
    if (adminPin.length < 4) setAdminPin((prev) => prev + num);
    setAdminError(false);
  };

  const handleAdminLogin = () => {
    if (adminPin === ADMIN_PIN) {
      setIsAdminAuthenticated(true);
      setShowAdminLogin(false);
      setKitchenTab("admin");
      setAdminPin("");
      showNotification("Yönetici girişi başarılı.");
    } else {
      setAdminError(true);
      setAdminPin("");
      showNotification("Hatalı Yönetici Şifresi!");
    }
  };

  const handleTabSwitch = (tab) => {
    if (tab === "admin" && !isAdminAuthenticated) {
      setShowAdminLogin(true);
    } else {
      setKitchenTab(tab);
    }
  };

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    showNotification(`${item.name} eklendi.`);
  };

  const removeFromCart = (itemId) => {
    setCart((prev) =>
      prev.reduce((acc, item) => {
        if (item.id === itemId) {
          if (item.quantity > 1)
            return [...acc, { ...item, quantity: item.quantity - 1 }];
          return acc;
        }
        return [...acc, item];
      }, [])
    );
  };

  const placeOrder = async () => {
    if (cart.length === 0 || !user) return;
    const secureTableId = parseInt(localStorage.getItem("connectedTable"));
    if (!secureTableId) {
      showNotification("Masa bilgisi doğrulanamadı.");
      return;
    }

    try {
      const newOrder = {
        tableId: secureTableId,
        items: cart,
        status: "hazırlanıyor",
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        startTime: Date.now(),
        timeString: new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      await addDoc(
        collection(db, ROOT_COLLECTION, "public", "orders"),
        newOrder
      );
      const audio = new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
      );
      audio.play().catch((e) => console.log("Ses çalınamadı"));
      setCart([]);
      setIsCartOpen(false);
      showNotification(`Sipariş Mutfağa İletildi!`);
    } catch (error) {
      console.error("Sipariş hatası:", error);
      showNotification("Sipariş gönderilemedi.");
    }
  };

  const completeOrder = async (orderId) => {
    if (!user) return;
    try {
      const orderRef = doc(db, ROOT_COLLECTION, "public", "orders", orderId);
      await updateDoc(orderRef, { status: "tamamlandı" });
      showNotification("Sipariş hazır!");
    } catch (error) {
      console.error("Güncelleme hatası:", error);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500000) {
        showNotification(
          "Dosya boyutu çok büyük! Lütfen 500KB altı resim kullanın."
        );
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setKitchenNewItem((prev) => ({ ...prev, image: reader.result }));
        showNotification("Resim seçildi.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddItem = async () => {
    if (!kitchenNewItem.name || !kitchenNewItem.price) {
      showNotification("İsim ve fiyat zorunludur.");
      return;
    }
    try {
      await addDoc(collection(db, ROOT_COLLECTION, "public", "menu_items"), {
        ...kitchenNewItem,
        price: Number(kitchenNewItem.price),
        image:
          kitchenNewItem.image ||
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600",
      });
      setKitchenNewItem({
        name: "",
        price: "",
        category: "Ana Yemek",
        description: "",
        ingredients: "",
        image: "",
      });
      showNotification("Ürün menüye eklendi!");
    } catch (e) {
      console.error("Ekleme hatası", e);
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
      await deleteDoc(doc(db, ROOT_COLLECTION, "public", "menu_items", id));
      showNotification("Ürün silindi.");
    }
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const renderLandingPage = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-6">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
        <div
          className={`absolute top-0 left-0 w-full h-1 ${
            connectionStatus === "connected"
              ? "bg-green-500"
              : "bg-orange-400 animate-pulse"
          }`}
        ></div>
        <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <QrCode className="text-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Hoşgeldiniz</h1>
        <p className="text-gray-500 mb-8">
          QR kodu okutunuz veya masa seçiniz.
        </p>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 bg-blue-50 p-2 rounded-lg border border-blue-100">
            <ShieldAlert size={16} className="text-blue-600" />
            <span className="text-xs text-blue-700 font-medium text-left">
              Güvenlik: Cihazınız seçilen masaya kilitlenir.
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
            {Array.from({ length: 15 }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => handleTableSelect(num)}
                className="flex flex-col items-center justify-center p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-orange-50 hover:border-orange-500 transition-all group"
              >
                <span className="font-bold text-gray-700 text-sm">
                  Masa {num}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="border-t pt-6">
          <button
            onClick={() => setIsLoginOpen(true)}
            className="flex items-center justify-center w-full gap-2 text-gray-500 hover:text-gray-800 hover:bg-gray-50 p-3 rounded-lg transition"
          >
            <Lock size={18} />
            <span className="font-medium text-sm">Personel Girişi</span>
          </button>
        </div>
      </div>
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">Personel Girişi</h3>
              <button
                onClick={() => {
                  setIsLoginOpen(false);
                  setPin("");
                }}
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex justify-center gap-4 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 ${
                    pin.length > i
                      ? "bg-gray-800 border-gray-800"
                      : "border-gray-300"
                  }`}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePinClick(num.toString())}
                  className="w-16 h-16 rounded-full bg-gray-50 hover:bg-gray-100 font-bold text-xl"
                >
                  {num}
                </button>
              ))}
              <div className="w-16 h-16"></div>
              <button
                onClick={() => handlePinClick("0")}
                className="w-16 h-16 rounded-full bg-gray-50 hover:bg-gray-100 font-bold text-xl"
              >
                0
              </button>
              <button
                onClick={handlePinDelete}
                className="w-16 h-16 rounded-full hover:bg-red-50 text-red-500"
              >
                <Delete size={24} />
              </button>
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold"
            >
              Giriş Yap
            </button>
            <div className="mt-4 text-center text-xs text-gray-400">
              Personel: 1234 | Yönetici: 9999
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderMenuPage = () => {
    const filteredMenu =
      activeCategory === "Tümü"
        ? menuItems
        : menuItems.filter((item) => item.category === activeCategory);

    return (
      <div className="min-h-screen bg-gray-50 pb-24 animate-fade-in relative">
        {selectedItem && (
          <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <div
              className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-64">
                <img
                  src={selectedItem.image}
                  className="w-full h-full object-cover"
                  alt={selectedItem.name}
                />
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-4 left-4 text-white">
                  <h2 className="text-2xl font-bold">{selectedItem.name}</h2>
                  <span className="bg-orange-500 px-2 py-0.5 rounded text-xs font-bold">
                    {selectedItem.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">{selectedItem.description}</p>
                <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-2">
                  İçindekiler
                </h3>
                <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {selectedItem.ingredients || "Standart içerik."}
                </p>
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <span className="text-3xl font-bold text-orange-600">
                    {selectedItem.price} ₺
                  </span>
                  <button
                    onClick={() => {
                      addToCart(selectedItem);
                      setSelectedItem(null);
                    }}
                    className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2"
                  >
                    <Plus size={20} /> Sepete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="flex justify-between items-center p-4">
            <div>
              <h2 className="font-bold text-lg text-gray-800">Lezzet Durağı</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">
                  Masa {currentTable}
                </span>
                <span className="text-[10px] bg-gray-100 text-gray-400 px-1 rounded border">
                  Kilitli
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="p-2 bg-gray-100 rounded-full text-gray-400"
              >
                <X size={20} />
              </button>
              <button
                onClick={() => setIsCartOpen(true)}
                className={`relative p-2 rounded-full text-white ${
                  cart.length > 0 ? "bg-orange-500" : "bg-gray-300"
                }`}
              >
                <ShoppingCart size={20} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white font-bold">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className="flex overflow-x-auto gap-2 p-4 pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-gray-800 text-white"
                    : "bg-white text-gray-600 border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {menuItems.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              Menü yükleniyor veya boş...
            </div>
          ) : (
            filteredMenu.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-4 cursor-pointer group"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-lg bg-gray-200"
                />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800">{item.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <span className="font-bold text-lg text-orange-600">
                      {item.price} ₺
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                      }}
                      className="bg-orange-50 text-orange-600 p-2 rounded-lg hover:bg-orange-500 hover:text-white transition active:scale-95"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {isCartOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
            <div className="bg-white w-full max-w-md h-full flex flex-col animate-slide-in-right shadow-2xl">
              <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-xl">
                  Sepet (Masa {currentTable})
                </h3>
                <button onClick={() => setIsCartOpen(false)}>
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-400 mt-10">Sepet boş.</p>
                ) : (
                  cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center border-b pb-4"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.name}</h4>
                        <span className="text-sm text-gray-500">
                          {item.price} ₺
                        </span>
                      </div>
                      <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-8 h-8 bg-white rounded flex items-center justify-center"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="font-bold">{item.quantity}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-8 h-8 bg-white rounded flex items-center justify-center"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-6 border-t bg-gray-50">
                <div className="flex justify-between mb-6">
                  <span className="text-gray-600">Toplam</span>
                  <span className="font-bold text-lg">{cartTotal} ₺</span>
                </div>
                <button
                  onClick={placeOrder}
                  disabled={cart.length === 0}
                  className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold disabled:opacity-50"
                >
                  Siparişi Onayla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderKitchenPage = () => {
    const sortedOrders = [...orders].sort((a, b) => {
      if (a.status !== b.status) return a.status === "hazırlanıyor" ? -1 : 1;
      return a.status === "hazırlanıyor"
        ? a.startTime - b.startTime
        : b.startTime - a.startTime;
    });

    const getElapsedTime = (startTime) =>
      Math.floor((currentTime - startTime) / 60000);

    return (
      <div className="min-h-screen bg-slate-100 p-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-xl">
                <ChefHat className="text-orange-600" size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Yönetim Paneli
                </h1>
                <div className="flex gap-4 mt-2">
                  <button
                    onClick={() => handleTabSwitch("orders")}
                    className={`text-sm font-bold px-4 py-2 rounded-lg transition ${
                      kitchenTab === "orders"
                        ? "bg-orange-500 text-white"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    Siparişler
                  </button>
                  <button
                    onClick={() => handleTabSwitch("admin")}
                    className={`text-sm font-bold px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                      kitchenTab === "admin"
                        ? "bg-orange-500 text-white"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {!isAdminAuthenticated && <Lock size={14} />} Menü Yönetimi
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setView("landing")}
              className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-medium hover:bg-slate-200 transition"
            >
              Çıkış
            </button>
          </div>

          {kitchenTab === "orders" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedOrders.length === 0 ? (
                <div className="col-span-full text-center py-20 text-slate-400">
                  Aktif sipariş yok.
                </div>
              ) : (
                sortedOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`bg-white rounded-2xl shadow-sm border p-4 ${
                      order.status === "hazırlanıyor"
                        ? "border-orange-200"
                        : "opacity-60 grayscale"
                    }`}
                  >
                    <div className="flex justify-between mb-4">
                      <span className="font-bold text-lg">
                        Masa {order.tableId}
                      </span>
                      <span className="text-xs font-bold bg-white px-2 py-1 rounded">
                        {order.timeString}
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      {order.items.map((i, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{i.name}</span>
                          <span className="font-bold">x{i.quantity}</span>
                        </div>
                      ))}
                    </div>
                    {order.status === "hazırlanıyor" && (
                      <button
                        onClick={() => completeOrder(order.id)}
                        className="w-full bg-green-600 text-white py-2 rounded-lg font-bold"
                      >
                        Hazırla
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {kitchenTab === "admin" && isAdminAuthenticated && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm h-fit">
                <div className="flex items-center gap-2 mb-4 text-orange-600 bg-orange-50 p-2 rounded-lg">
                  <ShieldCheck size={20} />
                  <span className="text-sm font-bold">Yönetici Modu Aktif</span>
                </div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Plus size={20} /> Yeni Ürün Ekle
                </h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Ürün Adı"
                    className="w-full p-3 bg-slate-50 rounded-xl border focus:outline-none focus:border-orange-500"
                    value={kitchenNewItem.name}
                    onChange={(e) =>
                      setKitchenNewItem({
                        ...kitchenNewItem,
                        name: e.target.value,
                      })
                    }
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Fiyat (TL)"
                      className="w-1/2 p-3 bg-slate-50 rounded-xl border"
                      value={kitchenNewItem.price}
                      onChange={(e) =>
                        setKitchenNewItem({
                          ...kitchenNewItem,
                          price: e.target.value,
                        })
                      }
                    />
                    <select
                      className="w-1/2 p-3 bg-slate-50 rounded-xl border"
                      value={kitchenNewItem.category}
                      onChange={(e) =>
                        setKitchenNewItem({
                          ...kitchenNewItem,
                          category: e.target.value,
                        })
                      }
                    >
                      {CATEGORIES.filter((c) => c !== "Tümü").map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* YENİ RESİM YÜKLEME ALANI */}
                  <div className="relative">
                    <label className="block w-full p-3 bg-slate-50 rounded-xl border border-dashed border-gray-300 text-center cursor-pointer hover:bg-slate-100 transition">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <div className="flex flex-col items-center gap-1 text-gray-500">
                        <Upload size={20} />
                        <span className="text-sm">Resim Yükle (Max 500KB)</span>
                      </div>
                    </label>
                  </div>
                  {kitchenNewItem.image && (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border">
                      <img
                        src={kitchenNewItem.image}
                        className="w-full h-full object-cover"
                        alt="Önizleme"
                      />
                      <button
                        onClick={() =>
                          setKitchenNewItem((prev) => ({ ...prev, image: "" }))
                        }
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Veya Resim URL'si girin"
                    className="w-full p-3 bg-slate-50 rounded-xl border text-sm"
                    value={
                      kitchenNewItem.image &&
                      kitchenNewItem.image.startsWith("data:")
                        ? ""
                        : kitchenNewItem.image
                    }
                    onChange={(e) =>
                      setKitchenNewItem({
                        ...kitchenNewItem,
                        image: e.target.value,
                      })
                    }
                  />

                  <textarea
                    placeholder="Açıklama"
                    className="w-full p-3 bg-slate-50 rounded-xl border h-20"
                    value={kitchenNewItem.description}
                    onChange={(e) =>
                      setKitchenNewItem({
                        ...kitchenNewItem,
                        description: e.target.value,
                      })
                    }
                  ></textarea>
                  <button
                    onClick={handleAddItem}
                    className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold"
                  >
                    Listeye Ekle
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-bold mb-4">
                  Mevcut Menü ({menuItems.length} Ürün)
                </h3>
                <div className="grid gap-4">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 border hover:border-orange-300 transition group"
                    >
                      <img
                        src={item.image}
                        className="w-16 h-16 rounded-lg object-cover bg-gray-200"
                        alt=""
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{item.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="bg-gray-100 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                          <span className="font-bold text-orange-600">
                            {item.price} ₺
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {showAdminLogin && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl border-4 border-orange-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Yönetici Girişi</h3>
                <button
                  onClick={() => {
                    setShowAdminLogin(false);
                    setAdminPin("");
                  }}
                >
                  <X size={24} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleAdminPinClick(num.toString())}
                    className="w-16 h-16 rounded-full bg-gray-50 hover:bg-gray-100 font-bold text-xl"
                  >
                    {num}
                  </button>
                ))}
                <div className="w-16 h-16"></div>
                <button
                  onClick={() => handleAdminPinClick("0")}
                  className="w-16 h-16 rounded-full bg-gray-50 hover:bg-gray-100 font-bold text-xl"
                >
                  0
                </button>
                <button
                  onClick={() => setAdminPin((prev) => prev.slice(0, -1))}
                  className="w-16 h-16 rounded-full hover:bg-red-50 text-red-500"
                >
                  <Delete size={24} />
                </button>
              </div>
              <button
                onClick={handleAdminLogin}
                className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold"
              >
                Onayla
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-[60] animate-bounce-short text-sm flex items-center gap-3">
          <CheckCircle size={18} className="text-green-400" />
          <span className="font-medium">{notification}</span>
        </div>
      )}
      {view === "landing" && renderLandingPage()}
      {view === "menu" && renderMenuPage()}
      {view === "kitchen" && renderKitchenPage()}
    </>
  );
}
