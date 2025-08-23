import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getChakraColor, getChakraGlow } from "@/lib/chakras";
import { formatDistanceToNow } from "date-fns";
import { ProfileIcon } from "@/components/ProfileIcon";
import Comments from "./Comments";
import { Zap, Heart, ChevronUp, ChevronDown, MessageCircle, Share2, Bookmark, BookmarkCheck } from "lucide-react";

interface PostCardProps {
  post: {
    id: string;
    content: string;
    imageUrl?: string;
    videoUrl?: string;
    chakra: string;
    frequency: number;
    type: string;
    createdAt: string;
    author: {
      id: string;
      username?: string;
      email?: string;
      sigil?: string;
    };
    engagements?: {
      upvote: number;
      downvote: number;
      like: number;
      energy: number;
    };
  };
}

export default function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userEngagements, setUserEngagements] = useState<string[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Fetch user engagement status for this post
  const { data: userEngagementData } = useQuery({
    queryKey: ["/api/posts", post.id, "engage/user"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/posts/${post.id}/engage/user`);
      return response.json();
    },
    enabled: !!user,
  });

  // Set initial engagement state when data is fetched
  useEffect(() => {
    if (userEngagementData?.engagements) {
      setUserEngagements(userEngagementData.engagements);
    }
  }, [userEngagementData]);

  const engageMutation = useMutation({
    mutationFn: async ({ type, remove }: { type: string; remove?: boolean }) => {
      if (remove) {
        return apiRequest("DELETE", `/api/posts/${post.id}/engage/${type}`);
      } else {
        return apiRequest("POST", `/api/posts/${post.id}/engage`, { type });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEngagement = (type: string) => {
    if (!user) {
      toast({
        title: "🔮 Mystical Access Required",
        description: "Please enter the spiritual realm to engage with posts",
        variant: "destructive",
      });
      return;
    }

    const isEngaged = userEngagements.includes(type);
    
    if (type === 'energy' && !isEngaged && ((user as any)?.energy || 0) < 10) {
      toast({
        title: "⚡ Energy Depleted",
        description: "Your spiritual energy is too low. Meditate to restore 10 energy points.",
        variant: "destructive",
      });
      return;
    }

    // Visual feedback for successful engagement
    if (!isEngaged) {
      const successMessages = {
        upvote: { title: "✨ Positive Vibrations Sent", description: "Your spiritual approval raises the post's frequency" },
        downvote: { title: "🌊 Constructive Energy Shared", description: "Your feedback helps balance the cosmic harmony" },
        like: { title: "💖 Love Resonance Activated", description: "Your heart chakra connects with this soul" },
        energy: { title: "⚡ Spiritual Energy Transferred", description: "10 energy points sent to amplify this wisdom" }
      };
      
      const message = successMessages[type as keyof typeof successMessages];
      if (message) {
        toast({
          title: message.title,
          description: message.description,
          duration: 3000,
        });
      }
    }

    engageMutation.mutate({ type, remove: isEngaged });
    
    // Optimistic update with mutual exclusion for votes
    if (isEngaged) {
      setUserEngagements(prev => prev.filter(e => e !== type));
    } else {
      setUserEngagements(prev => {
        let newEngagements = [...prev];
        
        // Remove opposite vote for upvote/downvote mutual exclusion
        if (type === 'upvote') {
          newEngagements = newEngagements.filter(e => e !== 'downvote');
        } else if (type === 'downvote') {
          newEngagements = newEngagements.filter(e => e !== 'upvote');
        }
        
        // Add the new engagement
        return [...newEngagements, type];
      });
    }
  };

  const handleShare = () => {
    const postUrl = `${window.location.origin}/?post=${post.id}`;
    const shareText = `🔮 Sacred wisdom from ${post.author.username || post.author.email || 'a mystical soul'} on Ascended Social:\n\n"${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}"\n\nEmbark on this spiritual journey: ${postUrl} ✨`;
    
    if (navigator.share) {
      // Use native sharing on mobile devices
      navigator.share({
        title: '🌟 Sacred Wisdom from Ascended Social',
        text: shareText,
        url: postUrl,
      }).catch((error) => {
        console.log('Error sharing:', error);
        fallbackShare(shareText);
      });
    } else {
      fallbackShare(shareText);
    }
  };

  const fallbackShare = (text: string) => {
    // Copy to clipboard as fallback
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "🔗 Sacred Link Copied!",
        description: "Spread this mystical wisdom to fellow seekers",
      });
    }).catch(() => {
      // Last resort: show the text in an alert
      alert(`Share this sacred wisdom:\n\n${text}`);
    });
  };

  const handleSave = () => {
    // Toggle saved state (this would integrate with backend saved posts)
    setIsSaved(!isSaved);
    toast({
      title: isSaved ? "📜 Removed from Sacred Collection" : "🏛️ Added to Sacred Collection!",
      description: isSaved ? 
        "This wisdom has been released from your spiritual library" : 
        "This sacred knowledge is now preserved in your mystical archives",
      duration: 2500,
    });
  };

  const chakraColor = getChakraColor(post.chakra);
  const chakraGlow = getChakraGlow(post.chakra);

  return (
    <Card className={`bg-cosmic-light rounded-xl overflow-hidden border-2 ${chakraGlow} hover-lift animate-fade-in`}>
      {/* Post Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ProfileIcon 
              user={post.author}
              size="sm"
              className="w-10 h-10 sigil-container"
              testId={`post-author-${post.id}`}
            />
            <div>
              <h4 
                className="font-semibold text-white cursor-pointer hover:text-primary transition-colors duration-200" 
                onClick={() => window.location.href = `/profile/${post.author.id}`}
                data-testid={`text-author-${post.id}`}
              >
                {post.author.username || post.author.email || 'Anonymous'}
              </h4>
              <p className="text-sm text-white/70" data-testid={`text-time-${post.id}`}>
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Chakra Indicator */}
            <div 
              className={`w-4 h-4 rounded-full animate-pulse`}
              style={{ backgroundColor: chakraColor }}
              title={`${post.chakra.replace('_', ' ')} Chakra`}
              data-testid={`chakra-indicator-${post.id}`}
            ></div>
            {/* Frequency Indicator */}
            <div 
              className="text-sm font-medium" 
              style={{ color: chakraColor }}
              data-testid={`frequency-${post.id}`}
            >
              {post.frequency > 0 ? '+' : ''}{post.frequency} Hz
            </div>
            {post.type !== 'post' && (
              <span className="bg-primary text-white text-xs px-2 py-1 rounded-full uppercase">
                {post.type}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-white leading-relaxed" data-testid={`content-${post.id}`}>
          {post.content}
        </p>
      </div>

      {/* Post Media */}
      {post.imageUrl && (
        <div className="relative">
          <img 
            src={post.imageUrl} 
            alt="Post image" 
            className="w-full h-80 object-cover"
            data-testid={`image-${post.id}`}
          />
        </div>
      )}

      {post.videoUrl && (
        <div className="relative bg-cosmic">
          <div className="aspect-video bg-gradient-to-br from-cosmic to-primary/20 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <Button 
                className="w-16 h-16 bg-primary/80 rounded-full hover:bg-primary"
                data-testid={`play-video-${post.id}`}
              >
                <i className="fas fa-play text-white text-xl ml-1"></i>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Engagement Bar */}
      <div className="p-4 border-t border-primary/20 bg-gradient-to-r from-transparent via-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          {/* Spiritual Engagement System */}
          <div className="flex items-center space-x-4">
            {/* Frequency Voting System */}
            <div className="flex items-center bg-black/30 rounded-full p-1 border border-primary/20">
              <Button
                variant="ghost"
                size="sm"
                className={`relative p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                  userEngagements.includes('upvote') 
                    ? 'text-green-300 bg-green-900/40 shadow-lg shadow-green-400/20' 
                    : 'text-white/70 hover:text-green-300 hover:bg-green-900/20'
                } ${engageMutation.isPending ? 'animate-pulse' : ''}`}
                onClick={() => handleEngagement('upvote')}
                disabled={engageMutation.isPending}
                title="✨ Raise Spiritual Frequency"
                data-testid={`button-upvote-${post.id}`}
              >
                <ChevronUp className="w-4 h-4" />
                {userEngagements.includes('upvote') && (
                  <div className="absolute inset-0 bg-green-400/20 rounded-full animate-ping"></div>
                )}
              </Button>
              
              <div className="px-3">
                <span 
                  className={`text-sm font-semibold transition-colors duration-300 ${
                    ((post.engagements?.upvote || 0) - (post.engagements?.downvote || 0)) >= 0 
                      ? 'text-green-300 drop-shadow-sm' 
                      : 'text-red-300 drop-shadow-sm'
                  }`}
                  data-testid={`votes-${post.id}`}
                >
                  {(post.engagements?.upvote || 0) - (post.engagements?.downvote || 0)}
                </span>
                <div className="text-xs text-white/50 text-center">freq</div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className={`relative p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                  userEngagements.includes('downvote') 
                    ? 'text-red-300 bg-red-900/40 shadow-lg shadow-red-400/20' 
                    : 'text-white/70 hover:text-red-300 hover:bg-red-900/20'
                } ${engageMutation.isPending ? 'animate-pulse' : ''}`}
                onClick={() => handleEngagement('downvote')}
                disabled={engageMutation.isPending}
                title="🌊 Provide Constructive Balance"
                data-testid={`button-downvote-${post.id}`}
              >
                <ChevronDown className="w-4 h-4" />
                {userEngagements.includes('downvote') && (
                  <div className="absolute inset-0 bg-red-400/20 rounded-full animate-ping"></div>
                )}
              </Button>
            </div>

            {/* Heart Resonance */}
            <Button
              variant="ghost"
              size="sm"
              className={`relative flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-300 hover:scale-105 ${
                userEngagements.includes('like') 
                  ? 'text-pink-300 bg-pink-900/40 shadow-lg shadow-pink-400/20' 
                  : 'text-white/70 hover:text-pink-300 hover:bg-pink-900/20'
              } ${engageMutation.isPending ? 'animate-pulse' : ''}`}
              onClick={() => handleEngagement('like')}
              disabled={engageMutation.isPending}
              title="💖 Send Heart Resonance"
              data-testid={`button-like-${post.id}`}
            >
              <Heart className={`w-4 h-4 transition-transform duration-200 ${
                userEngagements.includes('like') ? 'scale-110 fill-current animate-pulse' : 'hover:scale-110'
              }`} />
              <span className="text-sm font-medium" data-testid={`likes-${post.id}`}>
                {post.engagements?.like || 0}
              </span>
              {userEngagements.includes('like') && (
                <div className="absolute inset-0 bg-pink-400/20 rounded-full animate-ping"></div>
              )}
            </Button>

            {/* Spiritual Energy Transfer */}
            <Button
              variant="ghost"
              size="sm"
              className={`relative flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-300 hover:scale-105 ${
                userEngagements.includes('energy') 
                  ? 'text-yellow-300 bg-yellow-900/40 shadow-lg shadow-yellow-400/20' 
                  : 'text-white/70 hover:text-yellow-300 hover:bg-yellow-900/20'
              } ${engageMutation.isPending ? 'animate-pulse' : ''}`}
              onClick={() => handleEngagement('energy')}
              disabled={engageMutation.isPending || ((user as any)?.energy || 0) < 10}
              title={`⚡ Transfer Spiritual Energy (-10 energy) | Your Energy: ${(user as any)?.energy || 0}`}
              data-testid={`button-energy-${post.id}`}
            >
              <Zap className={`w-4 h-4 transition-transform duration-200 ${
                userEngagements.includes('energy') ? 'scale-110 animate-pulse' : 'hover:scale-110'
              }`} />
              <span className="text-sm font-medium" data-testid={`energy-${post.id}`}>
                {post.engagements?.energy || 0}
              </span>
              {((user as any)?.energy || 0) < 10 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
              {userEngagements.includes('energy') && (
                <>
                  <div className="absolute inset-0 bg-yellow-400/20 rounded-full animate-ping"></div>
                  <div className="absolute inset-0 overflow-hidden rounded-full">
                    <div className="absolute inset-x-0 -top-2 h-4 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent animate-pulse"></div>
                  </div>
                </>
              )}
            </Button>

            {/* Mystical Comments */}
            <Button
              variant="ghost"
              size="sm"
              className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-300 hover:scale-105 ${
                showComments 
                  ? 'text-purple-300 bg-purple-900/40 shadow-lg shadow-purple-400/20' 
                  : 'text-white/70 hover:text-purple-300 hover:bg-purple-900/20'
              }`}
              onClick={() => setShowComments(!showComments)}
              title="💬 Join the Sacred Discussion"
              data-testid={`button-comment-${post.id}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">Discuss</span>
            </Button>
          </div>

          {/* Mystical Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 rounded-full text-white/70 hover:text-cyan-300 hover:bg-cyan-900/20 transition-all duration-300 hover:scale-110"
              onClick={handleShare}
              title="🔗 Share Sacred Wisdom"
              data-testid={`button-share-${post.id}`}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                isSaved 
                  ? 'text-amber-300 hover:text-amber-400 bg-amber-900/20' 
                  : 'text-white/70 hover:text-amber-300 hover:bg-amber-900/20'
              }`}
              onClick={handleSave}
              title={isSaved ? "📜 Remove from Sacred Collection" : "📜 Save to Sacred Collection"}
              data-testid={`button-save-${post.id}`}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Comments Section */}
        <Comments postId={post.id} isVisible={showComments} />
      </div>
    </Card>
  );
}
