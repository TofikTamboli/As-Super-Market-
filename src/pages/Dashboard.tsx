import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Product, Order, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Plus, Package, ClipboardList, CheckCircle2, LogOut, Trash2, LayoutDashboard, Settings, Home, User } from 'lucide-react';
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
}

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  
  // Form state
  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
    price: '',
    stock: '',
    image: '',
    category: ''
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) { // 500KB limit for Base64
      toast.error('Image size should be less than 500KB');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProduct(prev => ({ ...prev, image: reader.result as string }));
      setIsUploading(false);
      toast.success('Image uploaded successfully');
    };
    reader.onerror = () => {
      setIsUploading(false);
      toast.error('Failed to read image');
    };
    reader.readAsDataURL(file);
  };

  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Sync products
    const pQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const pUnsubscribe = onSnapshot(pQuery, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    // Sync orders
    const oQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const oUnsubscribe = onSnapshot(oQuery, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => {
      pUnsubscribe();
      oUnsubscribe();
    };
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.title || !newProduct.price || !newProduct.image) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await addDoc(collection(db, 'products'), {
        ...newProduct,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        createdAt: serverTimestamp()
      });
      setNewProduct({ title: '', description: '', price: '', stock: '', image: '', category: '' });
      setIsAddingProduct(false);
      toast.success('Product added successfully');
    } catch (error: any) {
      toast.error('Failed to add product: ' + error.message);
    }
  };

  const toggleOrderComplete = async (orderId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        isCompleted: !currentStatus
      });
      toast.success(`Order marked as ${!currentStatus ? 'completed' : 'pending'}`);
    } catch (error: any) {
      toast.error('Failed to update order');
    }
  };

  const deleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteDoc(doc(db, 'products', productToDelete));
      toast.success('Product deleted');
      setProductToDelete(null);
    } catch (error: any) {
      toast.error('Failed to delete product');
    }
  };

  const deleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await deleteDoc(doc(db, 'orders', orderToDelete));
      toast.success('Order deleted');
      setOrderToDelete(null);
    } catch (error: any) {
      toast.error('Failed to delete order');
    }
  };

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 glass border-r border-black/5 p-6 fixed h-full">
        <div className="flex items-center gap-3 mb-12">
          <div className="text-2xl font-bold tracking-tight text-primary">As Super Market</div>
        </div>

        <nav className="flex-1 space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="w-5 h-5" />
            Overview
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-text-main/60">
            <Package className="w-5 h-5" />
            Inventory
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-text-main/60">
            <Settings className="w-5 h-5" />
            Settings
          </Button>
        </nav>

        <div className="pt-6 border-t border-black/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {profile?.displayName?.[0] || 'A'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{profile?.displayName || 'Admin'}</p>
              <p className="text-xs text-text-main/40 truncate">Administrator</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 glass border-b border-black/5 p-4 flex items-center justify-between z-50">
        <div className="text-xl font-bold tracking-tight text-primary">As Super Market</div>
        <Button variant="ghost" size="icon" className="rounded-xl text-destructive" onClick={handleLogout}>
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-10 pt-20 md:pt-10">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-text-main">Admin Dashboard</h2>
            <p className="text-text-main/50">Manage your inventory and orders.</p>
          </div>
          <Button onClick={() => setIsAddingProduct(true)} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2 h-11 px-6">
            <Plus className="w-5 h-5" />
            Add Product
          </Button>
        </header>

        <Tabs defaultValue="orders" className="space-y-8">
          <TabsList className="glass border-black/5 p-1 rounded-xl h-12">
            <TabsTrigger value="orders" className="rounded-lg px-8 data-[state=active]:bg-white/80 data-[state=active]:shadow-sm">Orders</TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-lg px-8 data-[state=active]:bg-white/80 data-[state=active]:shadow-sm">Inventory</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* To-Do List (Pending Orders) */}
              <Card className="glass-card border-black/5 rounded-3xl overflow-hidden">
                <CardHeader className="p-6 border-b border-black/5">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    Pending Orders
                  </CardTitle>
                  <CardDescription className="text-text-muted">Orders waiting to be processed.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="p-6 space-y-4">
                      <AnimatePresence mode="popLayout">
                        {orders.filter(o => !o.isCompleted).map((order) => (
                          <motion.div 
                            key={order.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-4 rounded-2xl bg-white/40 border border-black/5 shadow-sm relative overflow-hidden group"
                          >
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary animate-pulse" />
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-text-main">{order.clientName}</h4>
                                <p className="text-xs text-text-main/40">{order.clientEmail}</p>
                                <div className="mt-2 space-y-1">
                                  <p className="text-[10px] text-text-main/60 flex items-center gap-1">
                                    <Home className="w-3 h-3" /> {order.address}
                                  </p>
                                  <p className="text-[10px] text-text-main/60 flex items-center gap-1">
                                    <User className="w-3 h-3" /> {order.phone}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-primary/10 text-primary border-none">New</Badge>
                            </div>
                            <div className="space-y-1 mb-4">
                              {order.items.map((item, idx) => (
                                <p key={idx} className="text-sm text-text-main/60 flex justify-between">
                                  <span>{item.title} x {item.quantity}</span>
                                  <span>₹{item.price * item.quantity}</span>
                                </p>
                              ))}
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-black/5">
                              <div className="text-sm">
                                <p className="text-text-main/40 text-[10px] uppercase tracking-wider font-bold">Total</p>
                                <p className="font-bold text-success text-lg">₹{order.total}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setOrderToDelete(order.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="rounded-lg bg-success hover:bg-success/90 text-white gap-2"
                                  onClick={() => toggleOrderComplete(order.id, order.isCompleted)}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  Mark Complete
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {orders.filter(o => !o.isCompleted).length === 0 && (
                        <div className="text-center py-20 text-text-main/30">
                          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                          <p>All caught up! No pending orders.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Completed History */}
              <Card className="glass-card border-black/5 rounded-3xl overflow-hidden opacity-90">
                <CardHeader className="p-6 border-b border-black/5">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    Completed History
                  </CardTitle>
                  <CardDescription className="text-text-muted">Recently fulfilled orders.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="p-6 space-y-4">
                      {orders.filter(o => o.isCompleted).map((order) => (
                        <div key={order.id} className="p-4 rounded-2xl bg-white/30 border border-black/5 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-text-main">{order.clientName}</h4>
                              <p className="text-xs text-text-muted">₹{order.total} • {new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-text-main/40 hover:text-destructive"
                                onClick={() => setOrderToDelete(order.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-text-main/40 hover:text-primary"
                                onClick={() => toggleOrderComplete(order.id, order.isCompleted)}
                              >
                                Revert
                              </Button>
                            </div>
                          </div>
                          <div className="text-[10px] text-text-main/40 border-t border-black/5 pt-2">
                            <p>{order.address} • {order.phone}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="glass-card border-black/5 rounded-2xl overflow-hidden group">
                  <div className="aspect-square relative overflow-hidden bg-white/50">
                    <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                    <div className="absolute top-2 right-2">
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg"
                        onClick={() => setProductToDelete(product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-semibold truncate">{product.title}</h4>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-success font-bold">₹{product.price}</span>
                      <Badge variant="outline" className="text-[10px]">{product.stock} units</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsAddingProduct(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg glass p-8 rounded-[32px] shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">Add New Product</h3>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-text-main/40 ml-1">Title</label>
                    <Input 
                      placeholder="Basmati Rice" 
                      value={newProduct.title}
                      onChange={e => setNewProduct({...newProduct, title: e.target.value})}
                      className="bg-white/50 border-black/5 rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-text-main/40 ml-1">Category</label>
                    <Input 
                      placeholder="Staples" 
                      value={newProduct.category}
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      className="bg-white/50 border-black/5 rounded-xl h-11"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-text-main/40 ml-1">Description</label>
                  <Input 
                    placeholder="Premium long grain rice..." 
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                    className="bg-white/50 border-black/5 rounded-xl h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-text-main/40 ml-1">Price (₹)</label>
                    <Input 
                      type="number"
                      placeholder="550" 
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      className="bg-white/50 border-black/5 rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-text-main/40 ml-1">Stock (Units)</label>
                    <Input 
                      type="number"
                      placeholder="100" 
                      value={newProduct.stock}
                      onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                      className="bg-white/50 border-black/5 rounded-xl h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-text-main/40 ml-1">Product Image</label>
                  <div className="flex flex-col gap-3">
                    {newProduct.image && (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-black/5">
                        <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setNewProduct(prev => ({ ...prev, image: '' }))}
                          className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="relative">
                      <Input 
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="bg-white/50 border-black/5 rounded-xl h-11 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                      {isUploading && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-xl">
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-black/5" />
                      <span className="text-[10px] uppercase font-bold text-text-main/20">OR</span>
                      <div className="h-px flex-1 bg-black/5" />
                    </div>
                    <Input 
                      placeholder="Paste Image URL instead" 
                      value={newProduct.image}
                      onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                      className="bg-white/50 border-black/5 rounded-xl h-11"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="ghost" className="flex-1 rounded-xl h-12" onClick={() => setIsAddingProduct(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1 rounded-xl h-12 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">Create Product</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setProductToDelete(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm glass p-8 rounded-[32px] shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Delete Product?</h3>
              <p className="text-text-main/50 text-sm mb-8">
                This action cannot be undone. This product will be permanently removed from your inventory.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  className="flex-1 rounded-xl h-12" 
                  onClick={() => setProductToDelete(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1 rounded-xl h-12 bg-destructive text-white shadow-lg shadow-destructive/20" 
                  onClick={deleteProduct}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Order Confirmation Modal */}
      <AnimatePresence>
        {orderToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setOrderToDelete(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm glass p-8 rounded-[32px] shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Delete Order?</h3>
              <p className="text-text-main/50 text-sm mb-8">
                This action cannot be undone. This order will be permanently removed from history.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  className="flex-1 rounded-xl h-12" 
                  onClick={() => setOrderToDelete(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1 rounded-xl h-12 bg-destructive text-white shadow-lg shadow-destructive/20" 
                  onClick={deleteOrder}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
