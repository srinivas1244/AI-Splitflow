import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function Onboarding() {
  return (
    <div className="flex flex-col min-h-screen bg-[#8b5cf6] relative overflow-hidden">
      {/* Top half: Image */}
      <div className="flex-1 flex items-center justify-center relative pt-12 pb-24">
        {/* Glow behind image */}
        <div className="absolute inset-0 bg-[#8b5cf6]" />
        
        {/* The actual image */}
        <img 
          src="/hero-image.png" 
          alt="Split bills" 
          className="relative z-10 w-full max-w-sm h-auto object-cover px-4 animate-float drop-shadow-2xl"
          style={{ animation: 'float 6s ease-in-out infinite' }}
        />
      </div>

      {/* Bottom half: White card with curved top */}
      <div className="bg-white rounded-t-[40px] px-8 py-10 flex flex-col z-20 relative -mt-16 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <h1 className="text-[32px] leading-[1.2] font-bold text-slate-900 mb-4 tracking-tight">
          <span className="text-[#8b5cf6]">Easily split bills</span> with friends and track your spending.
        </h1>
        
        <p className="text-slate-400 text-[15px] leading-relaxed mb-12 max-w-sm pr-4">
          Bringing simplicity and joy to managing your finances, one split bill at a time.
        </p>

        {/* Carousel indicators and Next button */}
        <div className="flex items-center justify-between mt-auto pt-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-6 rounded-full bg-[#8b5cf6]"></div>
            <div className="h-2 w-2 rounded-full bg-slate-200"></div>
            <div className="h-2 w-2 rounded-full bg-slate-200"></div>
          </div>
          
          <Link 
            href="/login"
            className="w-14 h-14 rounded-full bg-[#111] flex items-center justify-center text-white hover:bg-black transition-colors shadow-lg hover:scale-105 active:scale-95"
          >
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </div>
    </div>
  )
}
