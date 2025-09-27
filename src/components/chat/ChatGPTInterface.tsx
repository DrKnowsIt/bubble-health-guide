import { useState, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Image as ImageIcon, Zap, Loader2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversationsQuery, Message } from "@/hooks/optimized/useConversationsQuery";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsersQuery } from "@/hooks/optimized/useUsersQuery";
import { useToast } from "@/hooks/use-toast";
import { useAnalysisNotifications } from "@/hooks/useAnalysisNotifications";
import { useMedicalImagePrompts } from "@/hooks/useMedicalImagePrompts";
import { useUnifiedAnalysis } from "@/hooks/useUnifiedAnalysis";
import { useSimpleTokenTimeout } from '@/hooks/useSimpleTokenTimeout';
import { supabase } from "@/integrations/supabase/client";
import EnhancedHealthInsightsPanel from "@/components/health/EnhancedHealthInsightsPanel";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { ChatAnalysisNotification, AnalysisResult } from "@/components/ChatAnalysisNotification";
import { MedicalImageConfirmationModal } from "@/components/modals/MedicalImageConfirmationModal";
import { ToastAction } from "@/components/ui/toast";
import { MedicalImagePrompt } from '@/components/ui/MedicalImagePrompt';
import { DemoConversation } from "@/components/chat/DemoConversation";
import { SimpleTokenTimeoutNotification } from "@/components/chat/SimpleTokenTimeoutNotification";

interface ChatGPTInterfaceProps {
  onSendMessage?: (message: string) => void;
  selectedUser?: any;
}

interface Diagnosis {
  id: string;
  conversation_id?: string;
  patient_id?: string;
  user_id?: string;
  topic?: string;
  health_topic?: string;
  diagnosis: string;
  relevance_score?: number;
  confidence: number;
  reasoning: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

const humanExamplePrompts = [
  "I have a headache that won't go away",
  "My knee hurts when I walk", 
  "I'm feeling chest pain",
  "I have trouble sleeping",
  "I'm experiencing back pain"
];

const petExamplePrompts = [
  "My dog seems lethargic and won't eat",
  "My cat is vomiting frequently",
  "My pet is limping on their back leg",
  "My dog is scratching excessively",
  "My cat is hiding and acting strange"
];


function ChatInterface({ onSendMessage, conversation, selectedUser }: ChatGPTInterfaceProps & { conversation: { currentConversation: string | null; messages: Message[]; setMessages: Dispatch<SetStateAction<Message[]>>; createConversation: (title: string, patientId?: string | null) => Promise<string | null>; saveMessage: (conversationId: string, type: 'user' | 'ai', content: string, imageUrl?: string) => Promise<void>; updateConversationTitleIfPlaceholder: (conversationId: string, newTitle: string) => Promise<void>; } }) {
  const { user } = useAuth();
  const { subscribed, createCheckoutSession } = useSubscription();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentConversation, messages, setMessages, createConversation, saveMessage, updateConversationTitleIfPlaceholder } = conversation;
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [healthTopics, setHealthTopics] = useState<Diagnosis[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ path: string; signedUrl: string; desc: string } | null>(null);
  const [messageAnalysis, setMessageAnalysis] = useState<Record<string, AnalysisResult[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Unified analysis system
  const { 
    analysisState, 
    updateMessageCount, 
    checkScheduledAnalysis, 
    triggerManualAnalysis,
    cleanup 
  } = useUnifiedAnalysis({
    conversationId: currentConversation,
    patientId: selectedUser?.id || null,
    onAnalysisComplete: (results) => {
      console.log('[ChatGPTInterface] Analysis completed:', results);
    }
  });
  
  // Legacy analysis notifications (for background features)
  const {
    performDiagnosisAnalysis,
    performSolutionAnalysis,
    performMemoryAnalysis
  } = useAnalysisNotifications(currentConversation, selectedUser?.id || null);
  
  // Token timeout handling
  const { isInTimeout, timeUntilReset, handleTokenLimitError, clearTimeout } = useSimpleTokenTimeout();
  
  console.log('🔍 [ChatGPTInterface] Timeout state:', { isInTimeout, timeUntilReset });

  // Medical image prompts
  const { 
    currentPrompt, 
    loading: imagePromptLoading, 
    triggerImagePrompt, 
    handleImageFeedback, 
    closeImagePrompt 
  } = useMedicalImagePrompts();
  

  // Stale reply guard
  const requestSeqRef = useRef(0);
  const convAtRef = useRef<string | null>(currentConversation);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Invalidate in-flight requests when conversation changes
  useEffect(() => {
    convAtRef.current = currentConversation;
    requestSeqRef.current += 1; // bump sequence to mark previous requests as stale
    setIsTyping(false);
    if (updateMessageCount) {
      updateMessageCount(0); // Reset message count for new conversation
    }
  }, [currentConversation, updateMessageCount]);

  // Load diagnoses when conversation or patient changes
  useEffect(() => {
    if (currentConversation && selectedUser?.id) {
      loadHealthTopicsForConversation();
    } else {
      setHealthTopics([]);
    }
  }, [currentConversation, selectedUser?.id]);

  // Real-time subscription for diagnosis updates
  useEffect(() => {
    if (!currentConversation || !selectedUser?.id) return;

    console.log('[ChatInterface] Setting up real-time subscription for diagnoses:', currentConversation);

    const diagnosisChannel = supabase
      .channel('diagnosis-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_diagnoses',
          filter: `conversation_id=eq.${currentConversation}`
        },
        (payload) => {
          console.log('[ChatInterface] Real-time diagnosis update:', payload);
          // Reload health topics when there's a database change
          setTimeout(() => {
            loadHealthTopicsForConversation();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      console.log('[ChatInterface] Cleaning up diagnosis real-time subscription');
      supabase.removeChannel(diagnosisChannel);
    };
  }, [currentConversation, selectedUser?.id]);

  const loadHealthTopicsForConversation = async () => {
    if (!currentConversation || !selectedUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('health_topics_for_discussion')
        .select('*')
        .eq('conversation_id', currentConversation)
        .eq('patient_id', selectedUser.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading health topics:', error);
        return;
      }

      // Map to interface format
      const mappedTopics = (data || []).map((item: any): Diagnosis => ({
        id: item.id,
        conversation_id: item.conversation_id,
        patient_id: item.patient_id,
        user_id: item.user_id,
        topic: item.health_topic,
        health_topic: item.health_topic,
        diagnosis: item.health_topic, // For backwards compatibility
        relevance_score: item.relevance_score || 0,
        confidence: item.relevance_score || 0, // For backwards compatibility
        reasoning: item.reasoning || '',
        category: item.category || 'general',
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      setHealthTopics(mappedTopics);
    } catch (error) {
      console.error('Error loading health topics:', error);
    }
  };

  const generateDiagnoses = async () => {
    if (!currentConversation || !selectedUser?.id || !user?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('generate-diagnosis', {
        body: {
          conversation_id: currentConversation,
          patient_id: selectedUser.id,
          user_id: user.id
        }
      });

      if (error) {
        console.error('Error generating diagnoses:', error);
        return;
      }

      if (data?.health_topics) {
        setHealthTopics(data.health_topics);
      }
    } catch (error) {
      console.error('Error generating diagnoses:', error);
    }
  };

  const generateConversationTitle = (message: string) => {
    return message.length > 50 ? message.substring(0, 50) + '...' : message;
  };

  const extractDiagnosesFromResponse = (response: string): { cleanResponse: string; extractedDiagnoses: any[] } => {
    try {
      // Find any inline JSON objects/arrays and strip diagnosis payloads from the chat text
      const objectRegex = /\{[\s\S]*?\}/g;
      const arrayRegex = /\[[\s\S]*?\]/g;

      let clean = response;
      const extracted: any[] = [];

      // Helper to try-parse JSON safely
      const tryParse = (text: string) => {
        try { return JSON.parse(text); } catch { return undefined; }
      };

      // 1) Remove objects that clearly look like diagnosis entries or analysis bundles
      const objectMatches = response.match(objectRegex) || [];
      for (const m of objectMatches) {
        const lower = m.toLowerCase();
        const parsed = tryParse(m);

        // a) Analysis bundle containing keys like diagnoses/suggested_forms
        if (lower.includes('diagnoses') || lower.includes('suggested_forms')) {
          clean = clean.replace(m, '').trim();
          // Try to take diagnoses from the bundle
          if (parsed && Array.isArray(parsed.diagnoses)) {
            extracted.push(...parsed.diagnoses);
          }
          continue;
        }

        // b) Single diagnosis object { diagnosis, confidence, reasoning? }
        if (parsed && typeof parsed === 'object' && 'diagnosis' in parsed && 'confidence' in parsed) {
          clean = clean.replace(m, '').trim();
          extracted.push(parsed);
          continue;
        }
      }

      // 2) Legacy: arrays containing diagnosis objects
      const arrayMatches = response.match(arrayRegex) || [];
      for (const a of arrayMatches) {
        const parsed = tryParse(a);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && 'diagnosis' in parsed[0]) {
          clean = clean.replace(a, '').trim();
          extracted.push(...parsed);
        }
      }

      // 3) Aggressively remove incomplete JSON structures that contain diagnosis keywords
      const incompleteJsonPatterns = [
        /\{\s*"diagnoses?":\s*\[([^\]]*)?$/gm,  // { "diagnoses": [ (incomplete)
        /\{\s*"diagnoses?":\s*\[.*?\]?\s*[,}]?\s*$/gm,  // { "diagnoses": [...] } or partial
        /"diagnoses?":\s*\[([^\]]*)?$/gm,       // "diagnoses": [ (incomplete)
        /\{\s*"[^"]*diagnos[^"]*":/gm,          // Any object with diagnosis key
        /\[\s*\{\s*"[^"]*diagnos[^"]*":/gm,     // Array starting with diagnosis object
      ];

      for (const pattern of incompleteJsonPatterns) {
        const matches = clean.match(pattern);
        if (matches) {
          console.debug('Removing incomplete JSON pattern:', matches);
          clean = clean.replace(pattern, '').trim();
        }
      }

      // 4) Remove any remaining lines that look like JSON fragments with diagnosis keywords
      const lines = clean.split('\n');
      const filteredLines = lines.filter(line => {
        const trimmed = line.trim();
        // Remove lines that contain diagnosis-related JSON patterns
        const hasDiagnosisJson = /["']?diagnos(e|es|is)["']?\s*:/.test(trimmed) || 
                                /\{\s*["']?diagnos/.test(trimmed) ||
                                /["']?diagnos[^"']*["']?\s*:\s*\[/.test(trimmed);
        if (hasDiagnosisJson) {
          console.debug('Removing line with diagnosis JSON pattern:', trimmed);
          return false;
        }
        return true;
      });
      clean = filteredLines.join('\n');

      // 5) Final cleanup of leftover punctuation from removed JSON
      clean = clean.replace(/\s{2,}/g, ' ')
                   .replace(/\s+,/g, ',')
                   .replace(/,\s+\./g, '.')
                   .replace(/\[\s*\]/g, '')
                   .replace(/\s*\]\s*,?/g, ' ')
                   .replace(/\s*\}\s*,?/g, ' ')
                   .replace(/\{\s*$/g, '')  // Remove orphaned opening braces
                   .replace(/^\s*[\}\]]/g, '')  // Remove orphaned closing braces/brackets
                   .trim();

      return { cleanResponse: clean, extractedDiagnoses: extracted };
    } catch (error) {
      console.error('Error extracting diagnoses:', error);
      return { cleanResponse: response, extractedDiagnoses: [] };
    }
  };

  const sanitizeVisibleText = (text: string) => {
    // Only remove explicit diagnosis section headings like "Possible diagnoses:"
    const lines = text.split(/\n+/);
    const filtered = lines.filter(l => !/^\s*(possible|potential|probable)\s+diagnoses?:/i.test(l.trim()));
    const result = filtered.join('\n').trim();
    if (!result) {
      console.debug('sanitizeVisibleText produced empty result; returning original text.');
      return text;
    }
    return result;
  };

  const uploadImageToHealthRecords = async (file: File): Promise<{ path: string; signedUrl: string } | null> => {
    try {
      setIsUploading(true);
      if (!file.type.startsWith('image/')) {
        toast({ title: "Unsupported file", description: "Please upload an image file.", variant: "destructive" });
        return null;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max size is 5MB.", variant: "destructive" });
        return null;
      }
      if (!user || !selectedUser?.id) {
        toast({ title: "Select a patient", description: "Please select a patient before uploading an image.", variant: "destructive" });
        return null;
      }
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${ext}`;
      const path = `${user.id}/${selectedUser.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('health-records').upload(path, file, { contentType: file.type });
      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({ title: "Upload failed", description: "Could not upload image.", variant: "destructive" });
        return null;
      }
      const { data: signed, error: signError } = await supabase.storage.from('health-records').createSignedUrl(path, 3600);
      if (signError || !signed?.signedUrl) {
        console.error('Signing error:', signError);
        toast({ title: "Error", description: "Could not create image link.", variant: "destructive" });
        return null;
      }
      return { path, signedUrl: signed.signedUrl };
    } finally {
      setIsUploading(false);
    }
  };

  const describeImageWithAI = async (signedUrl: string) => {
    try {
      const conversationHistory = messages.filter(msg => msg.id !== 'welcome').slice(-10);
      const { data, error } = await supabase.functions.invoke('describe-image', {
        body: {
          image_url: signedUrl,
          conversation_history: conversationHistory
        }
      });
      if (error) throw error;
      const desc = (data?.description || 'Uploaded image').toString();
      return desc;
    } catch (err) {
      console.error('Error describing image:', err);
      return 'Uploaded image';
    }
  };

  const handleSendMessage = async (messageText?: string, explicitImageUrl?: string) => {
    const baseText = (messageText ?? inputValue).trim();
    const textToSend = baseText || (pendingAttachment ? `I just attached an image: ${pendingAttachment.desc}` : '');
    if (!textToSend && !explicitImageUrl && !pendingAttachment) return;
    
    if (!selectedUser) {
      toast({ title: "Select Patient", description: "Please select a patient before sending a message.", variant: "destructive" });
      return;
    }
    
    // Unified timeout and rate limit check
    console.log('🔍 [ChatGPTInterface] Pre-send checks:', { isInTimeout, timeUntilReset });
    
    if (isInTimeout) {
      console.log('❌ [ChatGPTInterface] Message blocked due to token timeout');
      toast({ 
        title: "Chat temporarily unavailable", 
        description: "Token limit reached. Please wait for tokens to recharge.", 
        variant: "destructive" 
      });
      return;
    }
    
    console.log('✅ [ChatGPTInterface] All pre-send checks passed, proceeding with message');
    console.log('🔍 [ChatGPTInterface] Current conversation state:', { currentConversation, selectedUserId: selectedUser.id });
  
    // Handle image attachment similar to mobile/tablet
    let imageUrl = explicitImageUrl;
    if (pendingAttachment && !imageUrl) {
      try {
        if (user) {
          await supabase.from('health_records').insert({
            user_id: user.id,
            patient_id: selectedUser.id,
            record_type: 'image',
            title: pendingAttachment.desc || 'Uploaded image',
            file_url: pendingAttachment.path,
            category: 'imaging',
            tags: ['chat-upload'],
            metadata: { conversation_id: currentConversation || null, source: 'chat', ai_description: pendingAttachment.desc }
          });
        }
        imageUrl = pendingAttachment.signedUrl;
      } catch (err) {
        console.error('Error saving health record:', err);
      }
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type: 'user',
      content: textToSend,
      timestamp: new Date(),
      ...(imageUrl ? { image_url: imageUrl } : {})
    };
    
    // Add user message to UI immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    if (pendingAttachment) setPendingAttachment(null);

    // Ensure conversation exists
    let conversationId = currentConversation;
    console.log('🔍 [ChatGPTInterface] Before conversation creation:', { conversationId, currentConversation });
    
    if (!conversationId) {
      const title = textToSend.length > 50 ? textToSend.slice(0, 50) + '...' : textToSend;
      conversationId = await createConversation(title, selectedUser.id);
      console.log('🔍 [ChatGPTInterface] Created new conversation:', conversationId);
      
      if (!conversationId) {
        toast({ title: "Error", description: "Failed to create conversation", variant: "destructive" });
        return;
      }
      
      // Update conversation reference immediately for this request
      convAtRef.current = conversationId;
    }
    
    console.log('🔍 [ChatGPTInterface] Final conversation ID for request:', conversationId);

    // Save user message
    if (user) {
      await saveMessage(conversationId, 'user', textToSend, imageUrl || undefined);
      await updateConversationTitleIfPlaceholder(conversationId, textToSend.length > 50 ? textToSend.slice(0, 50) + '...' : textToSend);
    }
    
    // Mark this request and capture conversation at send time
    const reqId = ++requestSeqRef.current;
    const convoAtSend = conversationId || null;
    
    console.log('🔄 [ChatGPTInterface] Starting typing animation and API request:', { reqId, convoAtSend });
    setIsTyping(true);

    // Call onSendMessage callback
    onSendMessage?.(textToSend);

    try {
      // Prepare conversation history for context - match mobile/tablet pattern
      const conversationHistory = messages.filter(msg => msg.id !== 'welcome');
      const { data, error } = await supabase.functions.invoke('grok-chat', {
        body: {
          message: textToSend,
          conversation_history: conversationHistory,
          user_id: user?.id,
          conversation_id: conversationId,
          patient_id: selectedUser.id,
          image_url: imageUrl
        }
      });

      if (error) {
        throw error;
      }

      const responseContent = data.message || 'I apologize, but I am unable to process your request at the moment.';

      // Extract and clean diagnoses (preserve advanced features)
      const { cleanResponse, extractedDiagnoses } = extractDiagnosesFromResponse(responseContent);
      
      let sanitized = sanitizeVisibleText(cleanResponse);
      
      if (!sanitized) {
        sanitized = cleanResponse;
      }

      // Guard against stale responses - be more lenient with new conversations
      const currentConvoRef = convAtRef.current;
      console.log('🔍 [ChatGPTInterface] Stale guard check:', { 
        reqId, 
        currentReqId: requestSeqRef.current, 
        convoAtSend, 
        currentConvoRef 
      });
      
      if (reqId !== requestSeqRef.current) {
        console.log('❌ [ChatGPTInterface] Request stale due to sequence mismatch');
        return;
      }
      
      // Allow response if conversation matches OR if we just created a new conversation
      if (currentConvoRef !== convoAtSend && currentConvoRef !== null && convoAtSend !== null) {
        console.log('❌ [ChatGPTInterface] Request stale due to conversation mismatch');
        return;
      }
      
      console.log('✅ [ChatGPTInterface] Response allowed, adding AI message');

      const aiMessage: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        type: 'ai',
        content: sanitized,
        timestamp: new Date()
      };

      console.log('✅ [ChatGPTInterface] Creating AI message:', aiMessage);
      console.log('✅ [ChatGPTInterface] Current messages before adding AI response:', messages.length);

      setMessages(prev => {
        const newMessages = [...prev, aiMessage];
        console.log('✅ [ChatGPTInterface] Updated messages array:', newMessages.length);
        return newMessages;
      });

      // Save AI message
      if (user && conversationId) {
        await saveMessage(conversationId, 'ai', aiMessage.content);
      }
      
      // Track tokens after successful response - handled by server now
      // Token tracking is now fully server-side

      // Check for AI image suggestion or trigger based on user message
      console.log('🖼️ ChatGPTInterface: About to trigger image prompt with message:', textToSend);
      
      // Get recent conversation context (last 4 messages)
      const recentContext = messages.slice(-4).map(msg => 
        `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      );
      
      // Only trigger image prompts for human patients, not pets
      if (!selectedUser?.is_pet) {
        if (data.imageSuggestion) {
          console.log('🤖 ChatGPTInterface: Using AI image suggestion:', data.imageSuggestion);
          await triggerImagePrompt(textToSend, data.imageSuggestion, recentContext);
        } else {
          console.log('🔍 ChatGPTInterface: Analyzing user message for medical images');
          await triggerImagePrompt(textToSend, undefined, recentContext);
        }
      }

      // Update message count and trigger unified analysis
      const newMessageCount = analysisState.messageCount + 1;
      if (updateMessageCount) {
        updateMessageCount(newMessageCount);
      }
      
      // Check for scheduled analysis (regular every 4, deep every 16)
      const allMessages = [...messages, userMessage, aiMessage];
      await checkScheduledAnalysis(allMessages);

      // Background diagnosis analysis (preserve advanced features)
      if (conversationId && user && selectedUser?.id) {
        // Use server diagnoses if available, otherwise extracted ones
        if (Array.isArray((data as any)?.updated_diagnoses) && (data as any).updated_diagnoses.length > 0) {
          const mappedDiagnoses = ((data as any).updated_diagnoses as any[]).map((d: any): Diagnosis => ({
            id: d.id || `${Date.now()}-${Math.random()}`,
            conversation_id: conversationId || '',
            patient_id: selectedUser.id,
            user_id: user.id,
            diagnosis: d.diagnosis || d.name || '',
            confidence: typeof d.confidence === 'number' ? d.confidence : (typeof d.confidence_score === 'number' ? d.confidence_score : 0),
            reasoning: d.reasoning || d.explanation || '',
            created_at: d.created_at || new Date().toISOString(),
            updated_at: d.updated_at || new Date().toISOString(),
          }));
          setHealthTopics(mappedDiagnoses);
        } else if (extractedDiagnoses.length > 0) {
          const mappedDiagnoses = extractedDiagnoses.map((d: any): Diagnosis => ({
            id: d.id || `${Date.now()}-${Math.random()}`,
            conversation_id: conversationId || '',
            patient_id: selectedUser.id,
            user_id: user.id,
            topic: d.health_topic || d.diagnosis || d.name || '',
            health_topic: d.health_topic || d.diagnosis || d.name || '',
            diagnosis: d.diagnosis || d.name || '',
            relevance_score: typeof d.relevance_score === 'number' ? d.relevance_score : (typeof d.confidence === 'number' ? d.confidence : 0),
            confidence: typeof d.confidence === 'number' ? d.confidence : (typeof d.confidence_score === 'number' ? d.confidence_score : 0),
            reasoning: d.reasoning || d.explanation || '',
            created_at: d.created_at || new Date().toISOString(),
            updated_at: d.updated_at || new Date().toISOString(),
          }));
          setHealthTopics(mappedDiagnoses);
        }

        // Analysis already done when user sent message - no need to repeat
      }
    } catch (error: any) {
      console.error('Grok chat failed:', error);
      
      // Guard against stale responses for error handling too
      const currentConvoRef = convAtRef.current;
      if (reqId !== requestSeqRef.current) {
        console.log('❌ [ChatGPTInterface] Error response stale due to sequence mismatch');
        return;
      }
      
      if (currentConvoRef !== convoAtSend && currentConvoRef !== null && convoAtSend !== null) {
        console.log('❌ [ChatGPTInterface] Error response stale due to conversation mismatch');
        return;
      }

      let errorContent = 'I apologize, but I encountered an error while processing your request.';

      // Handle token limit timeout (429 status or token limit message)
      if (error?.status === 429 || error?.message?.includes('token limit')) {
        // Handle server-side token timeout
        handleTokenLimitError(error);
        // Don't add an error message for token limits - the UI will show the timeout notification
        return;
      } else if (error?.status === 403 || /pro/i.test(error?.message || '') || /subscription/i.test(error?.message || '')) {
        errorContent = 'AI Chat is a Pro feature. Upgrade to continue.';
        toast({
          title: 'Pro plan required',
          description: 'AI Chat requires a Pro subscription.',
          action: (
            <ToastAction altText="Upgrade" onClick={() => createCheckoutSession('pro')}>
              Upgrade to Pro
            </ToastAction>
          ),
        });
      } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
        errorContent = 'I\'m having trouble connecting to the server. Please check your internet connection and try again.';
      } else if (error.message?.includes('rate limit')) {
        errorContent = 'I\'m receiving too many requests right now. Please wait a moment and try again.';
      } else if (error.message?.includes('unauthorized')) {
        errorContent = 'Your session may have expired. Please try refreshing the page or logging in again.';
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: errorContent + ' You can try asking your question again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);

      // Save error message if authenticated
      if (user && conversationId) {
        await saveMessage(conversationId, 'ai', errorMessage.content);
      }
    } finally {
      // Always clear typing state regardless of success or error
      console.log('🔄 [ChatGPTInterface] Stopping typing animation');
      setIsTyping(false);
    }
  };

  const handleManualAnalysis = async () => {
    if (!currentConversation || !selectedUser?.id || !user || analysisState.isAnalyzing) return;

    try {
      console.log('🔍 Manual analysis triggered');
      
      // Show loading toast
      const loadingToast = toast({
        title: "Analyzing...",
        description: "Processing your conversation for health insights.",
      });

      // Wait for analysis to complete
      await triggerManualAnalysis(messages);
      
      // Wait a bit more for database updates
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reload health topics
      await loadHealthTopicsForConversation();
      
      // Show success toast
      toast({
        title: "Analysis Complete",
        description: "Health insights have been updated based on your conversation.",
      });

      console.log('✅ Manual analysis completed successfully');
      
    } catch (error) {
      console.error('❌ Manual analysis failed:', error);
      
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing your conversation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!user || !selectedUser?.id) {
      toast({
        title: "Select a patient",
        description: "Please select a patient before uploading an image.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const result = await uploadImageToHealthRecords(file);
    if (result?.path && result?.signedUrl) {
      const aiDesc = await describeImageWithAI(result.signedUrl);
      setPendingAttachment({ path: result.path, signedUrl: result.signedUrl, desc: aiDesc });
      toast({ title: "Image ready to send", description: aiDesc });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageButtonClick = () => {
    if (!subscribed) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user || !selectedUser?.id) {
      toast({
        title: "Select a patient",
        description: "Please select a patient before uploading an image.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const result = await uploadImageToHealthRecords(file);
    if (result?.path && result?.signedUrl) {
      const aiDesc = await describeImageWithAI(result.signedUrl);
      setPendingAttachment({ path: result.path, signedUrl: result.signedUrl, desc: aiDesc });
      toast({ title: "Image ready to send", description: aiDesc });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-full min-h-0">

        {/* Messages Area - Scrollable container */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4">
            <div className="space-y-4">
                {messages.length === 0 && !user && (
                  <div className="h-full">
                    <DemoConversation />
                  </div>
                )}

                {messages.length === 0 && user && (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center mx-auto mb-4">
                      <img 
                        src="/lovable-uploads/3e370215-2dd9-49b4-9004-374dd58c0bae.png"
                        alt="DrKnowsIt Logo - Cartoon Doctor with Head Mirror"
                        className="h-24 w-24 object-cover rounded-lg"
                      />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">
                      {selectedUser?.is_pet ? "How can I help with your pet today?" : "How can I help you today?"}
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      {selectedUser?.is_pet 
                        ? "I'm here to help with your pet's health questions and symptoms." 
                        : "I'm here to assist with your health questions and symptoms."
                      }
                    </p>
                    
                    {/* Example Prompts */}
                    <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                      {(selectedUser?.is_pet ? petExamplePrompts : humanExamplePrompts).map((prompt, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendMessage(prompt)}
                          className="text-sm"
                          disabled={!subscribed}
                        >
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message) => {
                  console.log('🔄 [ChatGPTInterface] Rendering message:', message.id, message.type, message.content.substring(0, 50));
                  return (
                    <div key={message.id}>
                      <div
                        className={cn(
                          "flex gap-3",
                          message.type === 'user' ? "justify-end" : "justify-start"
                        )}
                      >
                      {message.type === 'ai' && (
                         <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0 mt-1">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          "max-w-[85%] px-4 py-3 text-sm rounded-2xl break-words",
                          message.type === 'user' 
                            ? "bg-primary text-primary-foreground rounded-br-md" 
                            : "bg-muted text-foreground rounded-bl-md"
                        )}
                      >
                        {message.content}
                      </div>

                      {message.type === 'user' && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0 mt-1">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    
                     {/* Show analysis notifications after AI messages */}
                     {message.type === 'ai' && messageAnalysis[message.id] && (
                       <div className="flex justify-start">
                         <div className="w-8"></div> {/* Spacer to align with message */}
                         <div className="max-w-[85%]">
                           <ChatAnalysisNotification
                             results={messageAnalysis[message.id]}
                             onResultsProcessed={() => {
                               setMessageAnalysis(prev => {
                                 const newState = { ...prev };
                                 delete newState[message.id];
                                 return newState;
                               });
                             }}
                             className="mt-2"
                           />
                         </div>
                       </div>
                      )}
                    </div>
                  );
                })}

                  {/* Manual analysis results - show separately */}
                 {Object.entries(messageAnalysis).map(([id, results]) => {
                   if (!id.startsWith('manual-')) return null;
                   return (
                     <div key={id} className="flex justify-start">
                       <div className="w-8"></div> {/* Spacer to align with messages */}
                       <div className="max-w-[85%]">
                         <ChatAnalysisNotification
                           results={results}
                           onResultsProcessed={() => {
                             setMessageAnalysis(prev => {
                               const newState = { ...prev };
                               delete newState[id];
                               return newState;
                             });
                           }}
                           className="mt-2"
                         />
                       </div>
                     </div>
                   );
                 })}

                 {/* Typing Indicator */}
                 {isTyping && (() => {
                   console.log('🔄 [ChatGPTInterface] Showing typing indicator');
                   return (
                     <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0 mt-1">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                     </div>
                   );
                 })()}
                
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Token Timeout Notification */}
        <SimpleTokenTimeoutNotification />

        {/* Input Area - Fixed at bottom */}
        <div className="border-t border-border bg-background">
          <div className="max-w-4xl mx-auto p-4">
            
            {/* Medical Image Prompt */}
            {currentPrompt && currentPrompt.isVisible && (
              <div className="mb-4">
                <MedicalImagePrompt
                  searchTerm={currentPrompt.searchTerm}
                  images={currentPrompt.images}
                  aiSuggestion={currentPrompt.aiSuggestion}
                  onImageFeedback={(imageId, matches) => {
                    handleImageFeedback(imageId, matches, currentPrompt.searchTerm, currentConversation, selectedUser?.id);
                  }}
                  onClose={closeImagePrompt}
                />
              </div>
            )}
            
            {pendingAttachment && (
              <div className="mb-3 flex items-center gap-3 border border-border rounded-xl p-2 bg-muted/30">
                <div className="relative">
                  <img src={pendingAttachment.signedUrl} alt="Pending image attachment" className="h-16 w-16 rounded-lg object-cover" />
                </div>
                <div className="flex-1 text-sm text-foreground truncate">
                  {pendingAttachment.desc}
                </div>
                <Button variant="ghost" size="icon" aria-label="Remove attachment" onClick={() => setPendingAttachment(null)}>
                  ×
                </Button>
              </div>
            )}
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder={
                    !subscribed 
                      ? "Subscribe to start chatting..." 
                      : isInTimeout 
                        ? "Chat unavailable - DrKnowsIt is taking a break..." 
                        : "Message DrKnowsIt..."
                  }
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-base border-2 border-border bg-background focus:border-primary rounded-xl px-4 py-3 h-auto"
                  disabled={!subscribed || isInTimeout}
                />
              </div>

{/* Image upload temporarily disabled */}

              <Button 
                onClick={() => handleSendMessage()}
                disabled={(!inputValue.trim() && !pendingAttachment) || !subscribed || isInTimeout}
                size="lg"
                className="rounded-xl px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {/* Warning disclaimer */}
            <div className="mt-2 text-xs text-center text-muted-foreground">
              DrKnowsIt can make mistakes. Consider checking important information with healthcare professionals.
            </div>
          </div>
        </div>
      </div>

      {/* Diagnoses Sidebar - Always visible */}
      <div className="w-80 border-l border-border bg-background overflow-y-auto">
        <div className="p-4">
          <EnhancedHealthInsightsPanel 
            diagnoses={selectedUser && healthTopics ? healthTopics.map(d => ({
              diagnosis: d.health_topic,
              confidence: d.confidence,
              reasoning: d.reasoning || '',
              updated_at: d.updated_at || new Date().toISOString()
            })) : []}
            patientName={selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'You'}
            patientId={selectedUser?.id || ''}
            conversationId={currentConversation}
            showDemoTopics={!user}
          />
        </div>
      </div>

      {/* Medical Image Confirmation Modal */}
      <MedicalImageConfirmationModal
        isOpen={currentPrompt?.isVisible || false}
        onClose={closeImagePrompt}
        searchTerm={currentPrompt?.searchTerm || ''}
        images={currentPrompt?.images || []}
        onFeedback={(imageId, matches, searchTerm) => 
          handleImageFeedback(imageId, matches, searchTerm, currentConversation, selectedUser?.id)
        }
        loading={imagePromptLoading}
        intent={currentPrompt?.intent}
        aiSuggestion={currentPrompt?.aiSuggestion}
      />
    </div>
  );
}

export const ChatGPTInterface = ({ onSendMessage, selectedUser: propSelectedUser }: ChatGPTInterfaceProps) => {
  const { user } = useAuth();
  const { selectedUser: hookSelectedUser } = useUsersQuery();
  const selectedUser = propSelectedUser !== undefined ? propSelectedUser : hookSelectedUser;
  const conv = useConversationsQuery(selectedUser);

  const handleStartNewConversation = async () => {
    // Reset UI to empty state with examples; defer DB creation until first message
    conv.startNewConversation();
  };

  return (
    <div className="flex h-full w-full min-h-0 overflow-hidden">
      <ConversationSidebar 
        conversations={conv.conversations}
        currentConversation={conv.currentConversation}
        onSelectConversation={conv.selectConversation}
        onStartNewConversation={handleStartNewConversation}
        onDeleteConversation={(conversationId: string, confirmed: boolean) => conv.deleteConversation(conversationId, confirmed)}
        isAuthenticated={!!user}
      />
      <main className="flex-1 h-full min-h-0 overflow-hidden">
        <ChatInterface 
          onSendMessage={onSendMessage}
          selectedUser={selectedUser}
          conversation={{
            currentConversation: conv.currentConversation,
            messages: conv.messages,
            setMessages: conv.setMessages,
            createConversation: conv.createConversation,
            saveMessage: conv.saveMessage,
            updateConversationTitleIfPlaceholder: conv.updateConversationTitleIfPlaceholder,
          }}
        />
      </main>
    </div>
  );
};