import React from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { Product } from '../types';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  key?: React.Key;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="glass-card rounded-[16px] overflow-hidden transition-all duration-300 flex flex-col"
    >
      <div className="h-[160px] relative overflow-hidden bg-[#EEE] flex items-center justify-center text-4xl">
        {product.category === 'Rice' ? '🌾' : 
         product.category === 'Detergent' ? '🧼' : 
         product.category === 'Staples' ? '🍯' : '🍚'}
        <img 
          src={product.image} 
          alt={product.title}
          className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity"
          referrerPolicy="no-referrer"
          onLoad={(e) => (e.currentTarget.style.opacity = '1')}
        />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success mb-3 self-start">
          Popular
        </div>
        <h3 className="font-semibold text-lg text-text-main leading-tight mb-1">{product.title}</h3>
        <p className="text-sm text-text-muted mb-4">{product.category}</p>
        
        <div className="flex items-center justify-between mt-auto">
          <span className="text-lg font-bold text-text-main">₹{product.price}</span>
          <Button 
            onClick={() => onAddToCart(product)}
            className="rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs px-4 h-9 transition-transform active:scale-95"
          >
            ADD +
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
