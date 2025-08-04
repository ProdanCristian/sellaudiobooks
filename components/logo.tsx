import Link from 'next/link'
import { LucideVideo } from 'lucide-react'

export default function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center justify-center gap-1 text-foreground hover:opacity-80 transition-opacity cursor-pointer relative"
    >
      <div className="relative">
        <span
          className="text-2xl relative z-10"
          style={{ 
            fontFamily: "'Michroma', sans-serif",
          }}
        >
          FACELESS
        </span>
      </div>
      
      <div className="relative">
        <LucideVideo 
          className="w-9 h-9 relative z-10" 
          color='red'
        />
        <div className="absolute inset-0 w-9 h-9 animate-flare opacity-60">
          <LucideVideo className="w-9 h-9 text-red-500 blur-sm" />
        </div>
        <div className="absolute inset-0 w-9 h-9 animate-flare-slow opacity-40">
          <LucideVideo className="w-9 h-9 text-red-400 blur-md" />
        </div>
      </div>
      
      <div className="relative">
        <span
          className="text-2xl relative z-10"
          style={{ 
            fontFamily: "'Michroma', sans-serif",
          }}
        >
          CUT
        </span>
      </div>
      
      <style jsx>{`
        @keyframes flare {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        
        @keyframes flare-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.6;
          }
        }
        
        .animate-flare {
          animation: flare 2s ease-in-out infinite;
        }
        
        .animate-flare-slow {
          animation: flare-slow 3s ease-in-out infinite;
        }
      `}</style>
    </Link>
  );
}