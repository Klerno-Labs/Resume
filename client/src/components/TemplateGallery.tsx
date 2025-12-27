import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, Palette } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

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

  const styles = ['all', 'modern', 'classic', 'creative', 'minimal'];

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
        : { canAccess: false, reason: 'Upgrade to Pro for all templates' };
    }
    // Free: 3 templates only
    return index < 3
      ? { canAccess: true, reason: null }
      : { canAccess: false, reason: 'Upgrade to Premium for more templates' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="w-6 h-6 text-purple-500" />
            Template Gallery
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose from {templates.length} professional AI-generated designs
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Your tier:</span>
          <span className={`font-semibold px-3 py-1 rounded-full ${
            userTier === 'admin' ? 'bg-linear-to-r from-yellow-100 to-orange-100 text-orange-700' :
            userTier === 'pro' ? 'bg-purple-100 text-purple-700' :
            userTier === 'premium' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {userTier.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Style Filter */}
      <div className="flex gap-2 flex-wrap">
        {styles.map((style) => (
          <button
            key={style}
            onClick={() => setSelectedStyle(style)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedStyle === style
                ? 'bg-purple-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {style.charAt(0).toUpperCase() + style.slice(1)}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
          {filteredTemplates.map((template, index) => {
            const access = getTemplateAccess(template, index);
            const isSelected = currentTemplate === template.id;
            const isHovered = hoveredTemplate === template.id;

            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onMouseEnter={() => setHoveredTemplate(template.id)}
                onMouseLeave={() => setHoveredTemplate(null)}
                className={`relative border-2 rounded-xl overflow-hidden transition-all ${
                  isSelected
                    ? 'border-purple-500 shadow-xl ring-4 ring-purple-500/20'
                    : access.canAccess
                    ? 'border-gray-200 hover:border-purple-300 hover:shadow-lg'
                    : 'border-gray-200 opacity-60'
                }`}
              >
                {/* Selected Badge */}
                {isSelected && (
                  <div className="absolute top-3 right-3 z-10 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Active
                  </div>
                )}

                {/* Template Preview - Compact and Clean */}
                <div className="h-64 bg-white relative overflow-hidden">
                  <iframe
                    srcDoc={template.htmlTemplate}
                    className="w-full h-full border-0 pointer-events-none transform scale-[0.25] origin-top-left"
                    style={{ width: '400%', height: '400%' }}
                    title={`Preview of ${template.name}`}
                    sandbox="allow-same-origin"
                  />

                  {/* Locked Overlay */}
                  {!access.canAccess && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                      <Lock className="w-12 h-12 text-white mb-3" />
                      <p className="text-white font-semibold text-center px-4">
                        {access.reason}
                      </p>
                      <Button
                        onClick={onUpgradeClick}
                        className="mt-4 bg-linear-to-r from-purple-500 to-pink-500"
                        size="sm"
                      >
                        Upgrade Now
                      </Button>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  {access.canAccess && isHovered && !isSelected && (
                    <div className="absolute inset-0 bg-purple-500/10 flex items-center justify-center">
                      <Button
                        onClick={() => onSelectTemplate(template)}
                        className="bg-white text-purple-600 hover:bg-purple-50"
                      >
                        Select Template
                      </Button>
                    </div>
                  )}
                </div>

                {/* Template Info - Compact */}
                <div className="p-3 bg-linear-to-b from-white to-gray-50 border-t">
                  <h3 className="font-semibold text-xs mb-1.5 line-clamp-1">{template.name}</h3>
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{template.style}</span>
                    <div
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{
                        background: template.colorScheme.includes('gradient')
                          ? template.colorScheme
                          : `linear-gradient(135deg, ${template.colorScheme}, ${template.colorScheme})`
                      }}
                      title={template.colorScheme}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Tier Upgrade CTA */}
      {userTier !== 'pro' && userTier !== 'admin' && (
        <div className="mt-6 p-6 bg-linear-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">
                {userTier === 'free' ? 'Unlock 18 More Templates' : 'Unlock All Templates'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {userTier === 'free'
                  ? 'Upgrade to Premium for 10 templates, or Pro for all 21'
                  : 'Upgrade to Pro for access to all 21 professional templates'}
              </p>
            </div>
            <Button
              onClick={onUpgradeClick}
              className="bg-linear-to-r from-purple-500 to-pink-500 text-white"
            >
              {userTier === 'free' ? 'Upgrade to Premium' : 'Upgrade to Pro'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
