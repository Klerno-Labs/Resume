import React, { useEffect } from "react";

interface MetaProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
}

export const Seo: React.FC<MetaProps> = ({ title, description, canonical, ogImage }) => {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let md = document.querySelector('meta[name="description"]');
      if (!md) {
        md = document.createElement('meta');
        md.setAttribute('name', 'description');
        document.head.appendChild(md);
      }
      md.setAttribute('content', description);
    }
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.href = canonical;
    }
    if (ogImage) {
      let og = document.querySelector('meta[property="og:image"]');
      if (!og) {
        og = document.createElement('meta');
        og.setAttribute('property', 'og:image');
        document.head.appendChild(og);
      }
      og.setAttribute('content', ogImage);
    }
  }, [title, description, canonical, ogImage]);

  return null;
};

export default Seo;
