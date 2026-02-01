import React, { createContext, useContext, useState, useEffect } from 'react'
import { Product, CartItem } from '../utils/api'

interface CartContextType {
  items: CartItem[]
  cart: CartItem[] // Alias for backward compatibility
  lockedStoreId: number | null
  lockedStoreName: string | null
  addToCart: (product: Product, storeId?: number, storeName?: string) => void
  removeFromCart: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  totalPrice: number // Computed property
  getItemCount: () => number
  unlockStore: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([])
  const [lockedStoreId, setLockedStoreId] = useState<number | null>(null)
  const [lockedStoreName, setLockedStoreName] = useState<string | null>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tomo_cart')
    const savedStore = localStorage.getItem('tomo_locked_store')
    if (saved) {
      try {
        setItems(JSON.parse(saved))
        if (savedStore) {
          const storeData = JSON.parse(savedStore)
          setLockedStoreId(storeData.id)
          setLockedStoreName(storeData.name)
        }
      } catch (e) {
        console.error('Error loading cart:', e)
      }
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('tomo_cart', JSON.stringify(items))
    if (lockedStoreId && lockedStoreName) {
      localStorage.setItem('tomo_locked_store', JSON.stringify({ id: lockedStoreId, name: lockedStoreName }))
    } else {
      localStorage.removeItem('tomo_locked_store')
    }
  }, [items, lockedStoreId, lockedStoreName])

  const addToCart = (product: Product, storeId?: number, storeName?: string) => {
    console.log('🛒 Product Added:', product.name); // Test Log

    if (items.length === 0 && storeId && storeName) {
      setLockedStoreId(storeId)
      setLockedStoreName(storeName)
    }
    
    if (lockedStoreId && storeId && storeId !== lockedStoreId) {
      const shouldClear = window.confirm(
        `إضافة هذا المنتج سيمسح السلة الحالية من متجر "${lockedStoreName}". هل تريد المتابعة؟`
      )
      if (!shouldClear) return
      setItems([])
      setLockedStoreId(storeId)
      setLockedStoreName(storeName)
    }

    setItems((prev) => {
      // Loose equality to handle string/number IDs from different APIs
      const existing = (prev && Array.isArray(prev)) ? prev.find((item) => item.product.id == product.id) : undefined
      let newItems;
      if (existing) {
        newItems = prev.map((item) =>
          item.product.id == product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        newItems = [...prev, { product, quantity: 1 }]
      }
      
      // Calculate count immediately for the event
      const count = newItems.reduce((sum, item) => sum + item.quantity, 0);
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count } }));
      
      return newItems;
    })
    
    // Only show toast notification, don't open cart drawer
    window.dispatchEvent(new CustomEvent('show-toast', { 
      detail: { 
        message: 'تمت إضافة المنتج للسلة بنجاح 🛒',
        type: 'success' 
      } 
    }));
  }

  const removeFromCart = (productId: number) => {
    setItems((prev) => {
      const newItems = prev.filter((item) => item.product.id != productId)
      if (newItems.length === 0) {
        setLockedStoreId(null)
        setLockedStoreName(null)
      }
      return newItems
    })
  }

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id == productId ? { ...item, quantity } : item
      )
    )
  }

  const clearCart = () => {
    setItems([])
    setLockedStoreId(null)
    setLockedStoreName(null)
  }

  const unlockStore = () => {
    setLockedStoreId(null)
    setLockedStoreName(null)
    setItems([])
  }

  const getTotal = () => {
    return items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0)
  }

  const getItemCount = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }

  return (
    <CartContext.Provider
      value={{
        items,
        cart: items, // Alias
        lockedStoreId,
        lockedStoreName,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotal,
        totalPrice: getTotal(), // Computed
        getItemCount,
        unlockStore,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
