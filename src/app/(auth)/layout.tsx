import { Zap, Plus, Eye, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#FDFDF9]">

      {/* Left decorative panel (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] relative px-16 py-12 border-r border-slate-100">
        
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-[1.25rem] bg-[#FFD600] flex items-center justify-center shadow-sm">
            <Zap className="w-6 h-6 text-black" fill="currentColor" />
          </div>
          <span className="text-3xl font-black text-slate-900 tracking-tight">SplitFlow</span>
        </div>

        {/* Floating Cards Graphic */}
        <div className="relative h-[300px] w-full flex items-center justify-center pointer-events-none mt-16 mb-8">
           
           {/* Center Yellow Button */}
           <div className="absolute z-30 w-[4.5rem] h-[4.5rem] rounded-full bg-[#FFD600] flex items-center justify-center shadow-lg transform -translate-y-4 -translate-x-12">
             <Plus className="w-8 h-8 text-black" strokeWidth={3} />
           </div>

           {/* Green Card */}
           <div className="absolute z-20 w-72 h-44 bg-[#CBE8C9] rounded-[2rem] p-6 shadow-2xl shadow-green-900/10 transform translate-x-16 translate-y-12 rotate-3">
             <div className="flex items-center justify-between mb-4">
               <div className="bg-white rounded-full px-3 py-1.5 flex items-center gap-2 shadow-sm">
                 <span className="text-sm">🇺🇸</span>
                 <span className="text-xs font-bold text-slate-800">US Dollar</span>
               </div>
             </div>
             <p className="text-xs font-bold text-slate-600/80 mb-1 uppercase tracking-widest">Your balance</p>
             <div className="flex items-center gap-3">
               <p className="text-[2rem] leading-none font-medium text-slate-900 tracking-tight">$40,500.80</p>
               <div className="w-8 h-8 rounded-full bg-white/40 flex items-center justify-center backdrop-blur-sm">
                 <Eye className="w-4 h-4 text-slate-700" />
               </div>
             </div>
             <div className="flex justify-between mt-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Account number<br/><span className="text-slate-800 text-xs">**** 9934</span></span>
                <span className="text-right">Valid Thru<br/><span className="text-slate-800 text-xs">05/28</span></span>
             </div>
           </div>

           {/* Black Card */}
           <div className="absolute z-10 w-72 h-44 bg-[#1C1C1C] rounded-[2rem] p-6 shadow-2xl shadow-black/20 transform -translate-x-20 -translate-y-8 -rotate-6">
             <div className="flex items-center justify-between mb-4">
               <div className="bg-white/10 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 border border-white/10">
                 <span className="text-sm">🇺🇸</span>
                 <span className="text-xs font-bold text-white">US Dollar</span>
               </div>
             </div>
             <p className="text-xs font-bold text-white/50 mb-1 uppercase tracking-widest">Your balance</p>
             <p className="text-[2rem] leading-none font-medium text-white tracking-tight">$40,500.80</p>
             <div className="flex justify-between mt-5 text-[10px] font-bold text-white/50 uppercase tracking-widest">
                <span>Account number<br/><span className="text-white text-xs">**** 9934</span></span>
             </div>
           </div>

           {/* Pills */}
           <div className="absolute z-30 bg-white rounded-[1.5rem] px-5 py-3 shadow-xl flex items-center gap-2 transform -translate-x-28 -translate-y-28 rotate-[-6deg] border border-slate-100">
             <ArrowUpRight className="w-4 h-4 text-slate-800" strokeWidth={3} />
             <span className="text-sm font-bold text-slate-800">Transfer</span>
           </div>
           
           <div className="absolute z-30 bg-white rounded-[1.5rem] px-6 py-4 shadow-xl flex items-center gap-2 transform translate-x-24 translate-y-36 rotate-[6deg] border border-slate-100">
             <ArrowDownLeft className="w-5 h-5 text-slate-800" strokeWidth={3} />
             <span className="text-base font-bold text-slate-800">Request</span>
           </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <h2 className="text-[5.5rem] leading-[0.95] text-slate-900 tracking-tight mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            Good<br />
            finances,<br />
            better life.
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed max-w-lg mb-10 font-medium">
            Invest in projects that make a difference. Join us in supporting impactful initiatives and create a positive change in the world.
          </p>
        </div>
      </div>

      {/* Right panel: form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative bg-white dark:bg-[#121212]">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-[#FFD600] flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-black" fill="currentColor" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">SplitFlow</span>
        </div>

        <div className="w-full max-w-[440px]">
          {children}
        </div>
      </div>
    </div>
  )
}
