
export type BlockType = 'text' | 'image' | 'button' | 'spacer' | 'divider' | 'social' | 'html' | 'columns' | 'div';

export interface BlockStyle {
  backgroundColor?: string;
  backgroundGradient?: string; // linear-gradient(...)
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  backgroundRepeat?: 'no-repeat' | 'repeat';
  color?: string;
  textGradient?: string; // For text-fill-color gradient
  padding?: string;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  borderRadius?: number;
  width?: string;
  height?: string;
  border?: string;
}

export interface SocialItem {
  id: string;
  network: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok' | 'website' | 'email';
  url: string;
}

export interface Asset {
  id: string;
  name: string;
  url: string;
}

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: {
    text?: string;
    url?: string;
    alt?: string;
    width?: string;
    height?: string;
    html?: string;
    // For social
    socialLinks?: SocialItem[];
    iconStyle?: 'circle' | 'square' | 'rounded';
    // For columns
    columns?: EditorBlock[][]; 
    layout?: number[];
    // For Div (Container)
    children?: EditorBlock[];
  };
  style: BlockStyle;
}

export interface GlobalStyle {
  backgroundColor: string;
  backgroundImage?: string;
  contentWidth: number;
  contentBackgroundColor: string;
  fontFamily: string;
}
