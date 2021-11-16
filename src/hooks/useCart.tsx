import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storageCart = localStorage.getItem("@RocketShoes:cart");

    if (storageCart) {
      return JSON.parse(storageCart);
    }

    return [];
  });

  const cartRef = useRef<Product[]>();

  useEffect(() => {
    cartRef.current = cart;
  });

  const cartRefValue = cartRef.current ?? cart;

  useEffect(() => {
    if (cartRefValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, cartRef]);

  const addProduct = async (productId: number) => {
    try {    
      const newCart = [...cart];        
      const productExists = newCart.find(p => p.id === productId);
      
      const {data: stock } = await api.get<Stock>(`/stock/${productId}`);      
      
      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        productExists.amount = amount;
      } else {
        const { data: product } = await api.get<Product>(`/products/${productId}`);
        
        const newProduct = {
          ...product,
          amount: 1,
        };
        newCart.push(newProduct);
      }
      
      setCart(newCart);      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {      
      const newCart = [...cart];
      const productIndex = newCart.findIndex(product => product.id === productId);
      

      if (productIndex >= 0) {
        newCart.splice(productIndex, 1);
        setCart(newCart);        
      } else {
        throw new Error();
      }  
      
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {        
        return;
      }

      const stock = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      
      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);      

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);        
      } else {
        throw new Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
