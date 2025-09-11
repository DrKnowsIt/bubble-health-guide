import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ExternalLink, AlertTriangle } from 'lucide-react';

interface ProductSuggestion {
  name: string;
  price: string;
  rating: number;
  amazonUrl: string;
  imageUrl: string;
  category: string;
}

interface ProductCardProps {
  product: ProductSuggestion;
  showDisclaimer?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  showDisclaimer = false 
}) => {
  const handleViewOnAmazon = () => {
    window.open(product.amazonUrl, '_blank', 'noopener,noreferrer');
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="h-3 w-3 fill-yellow-400/50 text-yellow-400" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-3 w-3 text-muted-foreground/30" />
      );
    }

    return stars;
  };

  return (
    <Card className="bg-card/30 border-border/60 hover:bg-card/50 transition-colors">
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* Product Image */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-md bg-muted/50 border border-border/40 overflow-hidden">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/64x64?text=Product';
                }}
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-medium text-foreground leading-tight mb-1 line-clamp-2">
              {product.name}
            </h5>
            
            {/* Rating */}
            <div className="flex items-center gap-1 mb-1">
              <div className="flex items-center">
                {renderStars(product.rating)}
              </div>
              <span className="text-xs text-muted-foreground">
                {product.rating}
              </span>
            </div>

            {/* Price and Button */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-primary">
                {product.price}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewOnAmazon}
                className="h-6 px-2 text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
            </div>

            {/* Supplement Disclaimer */}
            {showDisclaimer && (product.category.includes('nutrition') || 
              product.name.toLowerCase().includes('vitamin') ||
              product.name.toLowerCase().includes('supplement') ||
              product.name.toLowerCase().includes('probiotic')) && (
              <div className="mt-2 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400 leading-tight">
                  Consult your doctor about dosage
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};