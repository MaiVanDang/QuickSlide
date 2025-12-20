import * as React from 'react';
import { BookOpen } from 'lucide-react';

interface ThemeVisualProps {
  title: string;
  subtitle: string;
  quote: string;
  emoji: string[];
}

export function ThemeVisual({ title, subtitle, quote, emoji }: ThemeVisualProps) {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 relative overflow-hidden">
      {/* Hiệu ứng mờ ảo (Opacity + Rounded Full) */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-white rounded-full"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white rounded-full"></div>
      </div>
      
      <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
        <BookOpen className="w-24 h-24 mb-8" />
        <h1 className="text-5xl mb-4">{title}</h1>
        <p className="text-2xl mb-8">{subtitle}</p>
        
        <div className="text-center space-y-4">
          {/* Backdrop Blur effect */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 max-w-md">
            <p className="text-xl">{quote}</p>
          </div>
          <div className="flex gap-4 justify-center text-4xl">
            {emoji.map((e, index) => <span key={index}>{e}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}