import { Bot, UserIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/hooks/optimized/useConversationsQuery';
import { ProductCard } from '@/components/ui/product-card';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.type === 'user';

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`flex max-w-[80%] gap-3 ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
            isUser
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isUser ? (
            <UserIcon className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>
        <div
          className={`px-4 py-3 rounded-2xl max-w-full overflow-hidden shadow-sm ${
            isUser
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

          {isUser ? (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
          ) : (
            <div className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none
              prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
              prose-headings:my-2 prose-headings:text-foreground
              prose-strong:text-foreground prose-em:text-foreground/90
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-code:text-primary prose-code:bg-background/50 prose-code:px-1 prose-code:rounded
              prose-pre:bg-background/50 prose-pre:rounded-lg">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
          
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