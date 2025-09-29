import { Bot, UserIcon } from 'lucide-react';
import { Message } from '@/hooks/optimized/useConversationsQuery';
import { ProductCard } from '@/components/ui/product-card';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <div className={`flex ${message.type === 'user' ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`flex max-w-[80%] gap-3 ${
          message.type === 'user' ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
            message.type === 'user' 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          }`}
        >
          {message.type === 'user' ? (
            <UserIcon className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>
        <div
          className={`px-4 py-3 rounded-2xl max-w-full overflow-hidden shadow-sm ${
            message.type === 'user'
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-foreground"
          }`}
        >
          {message.image_url && (
            <div className="mb-2">
              <img 
                src={message.image_url} 
                alt="Uploaded image" 
                className="max-w-full max-h-48 rounded-lg object-cover"
              />
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>
          
          {/* Product recommendations */}
          {message.products && message.products.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                Recommended products:
              </p>
              <div className="grid gap-2">
                {message.products.map((product, idx) => (
                  <ProductCard
                    key={idx}
                    product={{
                      name: product.name,
                      price: product.price,
                      rating: product.rating,
                      amazonUrl: (product as any).url || (product as any).amazonUrl,
                      imageUrl: (product as any).image || (product as any).imageUrl,
                      category: product.category
                    }}
                    showDisclaimer={idx === 0}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};