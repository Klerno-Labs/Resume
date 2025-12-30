import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, Palette, Sparkles, Star, TrendingUp, Zap, Crown } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

interface Template {
  id: string;
  name: string;
  style: string;
  colorScheme: string;
  htmlTemplate: string;
  previewImageUrl?: string;
  usageCount: number;
}

interface TemplateGalleryProps {
  currentTemplate?: string;
  onSelectTemplate: (template: Template) => void;
  userTier: 'free' | 'premium' | 'pro' | 'admin';
  onUpgradeClick: () => void;
}

export function TemplateGallery({ currentTemplate, onSelectTemplate, userTier, onUpgradeClick }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  useEffect(() => {
    void fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json() as Template[];
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const styles = [
    { value: 'all', label: 'All Styles', icon: Palette },
    { value: 'modern', label: 'Modern', icon: Zap },
    { value: 'classic', label: 'Classic', icon: Crown },
    { value: 'creative', label: 'Creative', icon: Sparkles },
    { value: 'minimal', label: 'Minimal', icon: Star },
  ];

  const filteredTemplates = selectedStyle === 'all'
    ? templates
    : templates.filter(t => t.style === selectedStyle);

  // Tier restrictions
  const getTemplateAccess = (template: Template, index: number) => {
    if (userTier === 'admin' || userTier === 'pro') return { canAccess: true, reason: null };
    if (userTier === 'premium') {
      // Premium: 10 templates
      return index < 10
        ? { canAccess: true, reason: null }
        : { canAccess: false, reason: 'Pro Feature' };
    }
    // Free: 3 templates only
    return index < 3
      ? { canAccess: true, reason: null }
      : { canAccess: false, reason: 'Premium Feature' };
  };

  const getPopularityBadge = (usageCount: number) => {
    if (usageCount > 50) return { label: 'Most Popular', color: 'bg-gradient-to-r from-orange-500 to-red-500' };
    if (usageCount > 20) return { label: 'Trending', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' };
    if (usageCount > 10) return { label: 'Popular', color: 'bg-gradient-to-r from-green-500 to-emerald-500' };
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <Sparkles className="w-6 h-6 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="bg-linear-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-blue-950/20 rounded-xl p-4 border border-purple-100 dark:border-purple-900">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Template Gallery</h3>
              <p className="text-xs text-muted-foreground">
                {templates.length} professional AI-designed resumes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={`font-semibold ${
                userTier === 'admin' ? 'bg-linear-to-r from-yellow-400 to-orange-500 text-white border-0' :
                userTier === 'pro' ? 'bg-linear-to-r from-purple-500 to-pink-500 text-white border-0' :
                userTier === 'premium' ? 'bg-linear-to-r from-blue-500 to-cyan-500 text-white border-0' :
                'bg-slate-100 text-slate-700'
              }`}
            >
              {userTier.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Style Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {styles.map((style) => {
            const Icon = style.icon;
            const isSelected = selectedStyle === style.value;
            return (
              <button
                key={style.value}
                onClick={() => setSelectedStyle(style.value)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${
                  isSelected
                    ? 'bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? '' : 'group-hover:scale-110 transition-transform'}`} />
                {style.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates Grid */}
      <ScrollArea className="h-[500px] pr-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedStyle}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4"
          >
            {filteredTemplates.map((template, index) => {
              const access = getTemplateAccess(template, index);
              const isSelected = currentTemplate === template.id;
              const isHovered = hoveredTemplate === template.id;
              const popularityBadge = getPopularityBadge(template.usageCount);

              return (
                <motion.div
                  key={template.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onMouseEnter={() => setHoveredTemplate(template.id)}
                  onMouseLeave={() => setHoveredTemplate(null)}
                  className={`group relative rounded-xl overflow-hidden transition-all duration-300 ${
                    isSelected
                      ? 'ring-2 ring-purple-500 ring-offset-2 shadow-xl shadow-purple-500/30'
                      : access.canAccess
                      ? 'hover:shadow-xl hover:-translate-y-1'
                      : 'opacity-75'
                  }`}
                >
                  <div className={`relative bg-white dark:bg-slate-800 border-2 transition-colors ${
                    isSelected
                      ? 'border-purple-500'
                      : access.canAccess
                      ? 'border-slate-200 dark:border-slate-700 group-hover:border-purple-300'
                      : 'border-slate-200 dark:border-slate-700'
                  } rounded-xl overflow-hidden`}>

                    {/* Status Badges - Top Right */}
                    <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5 items-end">
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="bg-linear-to-r from-green-500 to-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          ACTIVE
                        </motion.div>
                      )}
                      {popularityBadge && (
                        <div className={`${popularityBadge.color} text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1`}>
                          <TrendingUp className="w-3 h-3" />
                          {popularityBadge.label}
                        </div>
                      )}
                    </div>

                    {/* Template Preview */}
                    <div className="relative h-40 bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
                      <iframe
                        srcDoc={template.htmlTemplate}
                        className="w-full h-full border-0 pointer-events-none transform scale-[0.2] origin-top-left"
                        style={{ width: '500%', height: '500%' }}
                        title={`Preview of ${template.name}`}
                        sandbox="allow-same-origin allow-scripts"
                      />

                      {/* Locked Overlay */}
                      {!access.canAccess && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-linear-to-br from-slate-900/80 via-purple-900/80 to-pink-900/80 backdrop-blur-sm flex flex-col items-center justify-center"
                        >
                          <div className="bg-white/10 rounded-full p-3 mb-2">
                            <Lock className="w-6 h-6 text-white" />
                          </div>
                          <p className="text-white font-bold text-xs mb-1">
                            {access.reason}
                          </p>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpgradeClick();
                            }}
                            size="sm"
                            className="bg-linear-to-r from-purple-500 to-pink-500 text-white border-0 h-7 text-xs"
                          >
                            Unlock
                          </Button>
                        </motion.div>
                      )}

                      {/* Hover Overlay with Quick Actions */}
                      {access.canAccess && isHovered && !isSelected && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-linear-to-t from-purple-900/90 via-purple-600/50 to-transparent flex items-end justify-center pb-4"
                        >
                          <Button
                            onClick={() => onSelectTemplate(template)}
                            size="sm"
                            className="bg-white text-purple-600 hover:bg-purple-50 font-semibold shadow-lg"
                          >
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                            Use This Template
                          </Button>
                        </motion.div>
                      )}
                    </div>

                    {/* Template Info */}
                    <div className="p-3 bg-linear-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 flex-1">
                          {template.name}
                        </h4>
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-600 shadow-sm shrink-0"
                          style={{
                            background: template.colorScheme.includes('gradient')
                              ? template.colorScheme
                              : `linear-gradient(135deg, ${template.colorScheme}, ${template.colorScheme}dd)`
                          }}
                          title={template.colorScheme}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <Badge
                          variant="outline"
                          className="capitalize text-[10px] font-medium border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        >
                          {template.style}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {template.usageCount} uses
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Palette className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">No templates found</h3>
            <p className="text-sm text-muted-foreground">Try selecting a different style filter</p>
          </div>
        )}
      </ScrollArea>

      {/* Tier Upgrade CTA */}
      {userTier !== 'pro' && userTier !== 'admin' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl bg-linear-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                    {userTier === 'free'
                      ? `Unlock ${templates.length - 3} More Templates`
                      : `Unlock ${templates.length - 10} More Templates`
                    }
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {userTier === 'free'
                      ? 'Upgrade to access premium AI-designed resume templates'
                      : 'Upgrade to Pro for unlimited access to all templates'}
                  </p>
                </div>
              </div>
              <Button
                onClick={onUpgradeClick}
                size="sm"
                className="bg-linear-to-r from-purple-600 to-pink-600 text-white border-0 shrink-0 shadow-lg hover:shadow-xl transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Upgrade
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
