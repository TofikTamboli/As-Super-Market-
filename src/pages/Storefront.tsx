import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Product, OrderItem, PaymentMode, Order } from '../types';
import { useAuth } from '../contexts/AuthContext';
import ProductCard from '../components/ProductCard';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Search, LogOut, Package, Trash2, Plus, Minus, Home, User, ShoppingBasket, ClipboardList, CreditCard, MapPin, Phone } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Firestore Error Handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Don't throw here to avoid crashing the whole app, but log it properly for the agent
}

export default function Storefront() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState<'store' | 'orders' | 'profile'>('store');
  const [clientOrders, setClientOrders] = useState<Order[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    // Filter by clientId to satisfy security rules and avoid permission-denied
    // We remove orderBy to avoid requiring a composite index for now
    const q = query(
      collection(db, 'orders'), 
      where('clientId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Order))
        // Sort client-side since we removed orderBy from the query
        .sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
      setClientOrders(orders);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return unsubscribe;
  }, [user]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const checkoutTotal = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleBuyNow = (product: Product) => {
    setCheckoutItems([{
      productId: product.id,
      title: product.title,
      price: product.price,
      quantity: 1
    }]);
    setIsCheckoutModalOpen(true);
  };

  const validatePhone = (num: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(num);
  };

  const handleCheckout = async () => {
    if (!address) {
      toast.error('Please provide a delivery address');
      return;
    }
    
    if (!phone) {
      toast.error('Please provide a phone number');
      return;
    }

    if (!validatePhone(phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (checkoutItems.length === 0) {
      toast.error('No items to checkout');
      return;
    }

    setIsCheckingOut(true);
    try {
      await addDoc(collection(db, 'orders'), {
        clientId: user?.uid,
        clientName: profile?.displayName || user?.email,
        clientEmail: user?.email,
        address,
        phone,
        items: checkoutItems,
        paymentMode,
        total: checkoutTotal, // Delivery charge removed
        isCompleted: false,
        createdAt: serverTimestamp(),
      });
      
      setAddress('');
      setPhone('');
      setIsCheckoutModalOpen(false);
      setCheckoutItems([]);
      toast.success('Order placed successfully!');
      setActiveTab('orders');
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to place order: ' + error.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-frosted pb-20 md:pb-0">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 glass px-10 py-4 flex items-center justify-between gap-8 border-b border-black/5">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold tracking-tight text-primary">As Super Market</div>
        </div>

        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-main/40" />
          <Input 
            placeholder="Search rice, detergent, staples..." 
            className="pl-10 h-10 bg-white/50 border-black/10 rounded-xl focus:ring-primary/20 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <span 
            className={cn("cursor-pointer hover:text-primary transition-colors", activeTab === 'store' && "text-primary font-bold")}
            onClick={() => setActiveTab('store')}
          >
            Store
          </span>
          <span 
            className={cn("cursor-pointer hover:text-primary transition-colors", activeTab === 'orders' && "text-primary font-bold")}
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </span>
          <span 
            className={cn("cursor-pointer hover:text-primary transition-colors", activeTab === 'profile' && "text-primary font-bold")}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </span>
          
          <Button variant="ghost" size="icon" className="rounded-xl h-11 w-11" onClick={handleLogout}>
            <LogOut className="w-5 h-5 text-text-main/60" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-10">
        <div className="mb-10">
          <h2 className="text-[28px] md:text-[32px] font-bold text-text-main tracking-tight mb-2">
            {activeTab === 'store' && "Essentials Delivery"}
            {activeTab === 'orders' && "Your Orders"}
            {activeTab === 'profile' && "Your Profile"}
          </h2>
          <p className="text-text-muted">
            {activeTab === 'store' && "Premium groceries delivered to your door."}
            {activeTab === 'orders' && "Track and manage your recent purchases."}
            {activeTab === 'profile' && "Manage your account and preferences."}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'store' && (
            <motion.div 
              key="store"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10"
            >
              <div className="section">
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-text-main/40">
                    <Package className="w-16 h-16 opacity-10 mb-4" />
                    <p className="text-lg">No products found matching your search.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        onBuyNow={handleBuyNow}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar Info */}
              <div className="hidden lg:block space-y-6">
                <div className="p-6 bg-success/10 rounded-2xl border border-success/20">
                  <div className="text-success font-bold text-sm mb-1">Free Shipping</div>
                  <div className="text-xs text-text-main/80 leading-relaxed">
                    Add ₹120 more to unlock free delivery on this order.
                  </div>
                </div>
                
                <div className="glass-card p-6 rounded-2xl">
                  <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-text-muted">Quick Links</h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2 text-text-main/70 hover:text-primary cursor-pointer transition-colors" onClick={() => setActiveTab('orders')}>
                      <Package className="w-4 h-4" /> Track Order
                    </li>
                    <li className="flex items-center gap-2 text-text-main/70 hover:text-primary cursor-pointer transition-colors" onClick={() => setActiveTab('profile')}>
                      <User className="w-4 h-4" /> Profile Settings
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl space-y-4"
            >
              {clientOrders.length === 0 ? (
                <div className="text-center py-20 glass-card rounded-3xl">
                  <ShoppingBasket className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="text-text-muted">You haven't placed any orders yet.</p>
                  <Button variant="link" onClick={() => setActiveTab('store')}>Start Shopping</Button>
                </div>
              ) : (
                clientOrders.map(order => (
                  <div key={order.id} className="glass-card p-6 rounded-2xl border border-black/5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs text-text-muted font-bold uppercase">Order ID: {order.id.slice(-6)}</p>
                        <p className="text-sm text-text-main/60">{new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                      </div>
                      <Badge className={order.isCompleted ? "bg-success/10 text-success border-none" : "bg-primary/10 text-primary border-none"}>
                        {order.isCompleted ? "Delivered" : "Processing"}
                      </Badge>
                    </div>
                    <div className="space-y-2 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.title} x {item.quantity}</span>
                          <span>₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-black/5 flex justify-between items-center">
                      <span className="font-bold">Total Paid</span>
                      <span className="text-lg font-bold text-success">₹{order.total}</span>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-md mx-auto"
            >
              <div className="glass-card p-8 rounded-[32px] text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-primary/10 mx-auto flex items-center justify-center text-primary text-3xl font-bold">
                  {profile?.displayName?.[0] || user?.email?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{profile?.displayName || 'User'}</h3>
                  <p className="text-text-muted">{user?.email}</p>
                </div>
                <div className="pt-6 border-t border-black/5 space-y-3">
                  <Button variant="outline" className="w-full rounded-xl h-12" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-black/5 px-6 py-3 flex items-center justify-around z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("rounded-xl", activeTab === 'store' ? "text-primary" : "text-text-main/40")}
          onClick={() => setActiveTab('store')}
        >
          <Home className="w-6 h-6" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("rounded-xl", activeTab === 'orders' ? "text-primary" : "text-text-main/40")}
          onClick={() => setActiveTab('orders')}
        >
          <Package className="w-6 h-6" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("rounded-xl", activeTab === 'profile' ? "text-primary" : "text-text-main/40")}
          onClick={() => setActiveTab('profile')}
        >
          <User className="w-6 h-6" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-xl text-destructive" onClick={handleLogout}>
          <LogOut className="w-6 h-6" />
        </Button>
      </nav>

      {/* Checkout Modal */}
      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent className="sm:max-w-[450px] glass-drawer border-white/40 rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-2xl font-bold">Checkout</DialogTitle>
            <DialogDescription>
              Complete your order by providing delivery details.
            </DialogDescription>
          </DialogHeader>

          <div className="p-8 pt-0 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Delivery Address
                </label>
                <Input 
                  placeholder="Street, House No, Area..." 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-white/50 border-black/10 rounded-xl h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                  <Phone className="w-3 h-3" /> Contact Number
                </label>
                <Input 
                  placeholder="+91 XXXXX XXXXX" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-white/50 border-black/10 rounded-xl h-12"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <CreditCard className="w-3 h-3" /> Payment Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div 
                  className={cn(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2",
                    paymentMode === 'UPI' ? "border-primary bg-primary/5" : "border-black/5 hover:border-black/10"
                  )}
                  onClick={() => setPaymentMode('UPI')}
                >
                  <span className="font-bold text-sm">UPI</span>
                  <span className="text-[10px] text-text-muted">Instant Pay</span>
                </div>
                <div 
                  className={cn(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2",
                    paymentMode === 'COD' ? "border-primary bg-primary/5" : "border-black/5 hover:border-black/10"
                  )}
                  onClick={() => setPaymentMode('COD')}
                >
                  <span className="font-bold text-sm">COD</span>
                  <span className="text-[10px] text-text-muted">Cash on Delivery</span>
                </div>
              </div>
            </div>

            <div className="bg-black/5 rounded-2xl p-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Items ({checkoutItems.length})</span>
                <span className="font-medium">₹{checkoutTotal}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-black/10">
                <span>Total Amount</span>
                <span className="text-primary">₹{checkoutTotal}</span>
              </div>
            </div>

            <Button 
              className="w-full h-14 rounded-2xl bg-text-main hover:bg-text-main/90 text-white font-bold text-lg shadow-lg transition-all active:scale-[0.98]"
              onClick={handleCheckout}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? 'Processing...' : 'Place Order Now'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
