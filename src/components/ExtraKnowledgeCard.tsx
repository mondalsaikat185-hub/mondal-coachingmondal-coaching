import React from 'react';
import { BookOpen, PlayCircle, Sparkles } from 'lucide-react';

// Student home: glowing 3D "Extra Knowledge" section -> Sanvi Tools Study Hub + YouTube channel.
const STUDY_HUB_URL = 'https://sanvitools.in/study/competitive';
const YOUTUBE_URL = 'https://www.youtube.com/@SanviTools';

export function ExtraKnowledgeCard() {
  const btn = 'flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-black text-sm text-white border-2 active:translate-y-1 transition-all';
  return (
    <div className="mb-5 rounded-2xl border-4 border-zinc-900 dark:border-zinc-100 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800 p-4 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)]">
      <style>{`@keyframes mcGlow3d{0%,100%{opacity:1;transform:translateY(0);box-shadow:0 4px 0 #7c2d12,0 0 18px 4px rgba(251,191,36,.9)}50%{opacity:.55;transform:translateY(2px);box-shadow:0 2px 0 #7c2d12,0 0 4px 0 rgba(251,191,36,.2)}}`}</style>
      <span
        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black uppercase text-white bg-gradient-to-b from-amber-400 to-orange-600 border-2 border-orange-800"
        style={{ animation: 'mcGlow3d 1.6s ease-in-out infinite' }}
      >
        <Sparkles className="w-3.5 h-3.5" /> Extra Knowledge
      </span>
      <h3 className="mt-3 font-black text-lg text-zinc-900 dark:text-zinc-100">আরও জানতে চাও? ✨</h3>
      <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        ক্লাসের বাইরেও নিজেকে এগিয়ে রাখো — প্রতিযোগিতামূলক পরীক্ষার বাড়তি তথ্য, নোট আর সাধারণ জ্ঞান পড়ো Study Hub-এ, আর সহজ ভিডিওতে বুঝে নাও আমাদের YouTube চ্যানেলে।
      </p>
      <div className="mt-3 flex flex-col sm:flex-row gap-3">
        <a href={STUDY_HUB_URL} target="_blank" rel="noopener noreferrer"
          className={`${btn} bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-900 shadow-[0_4px_0_0_#064e3b] active:shadow-[0_1px_0_0_#064e3b]`}>
          <BookOpen className="w-4 h-4" /> Study Hub-এ পড়ো
        </a>
        <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer"
          className={`${btn} bg-gradient-to-b from-red-500 to-red-700 border-red-900 shadow-[0_4px_0_0_#7f1d1d] active:shadow-[0_1px_0_0_#7f1d1d]`}>
          <PlayCircle className="w-4 h-4" /> YouTube-এ ভিডিও দেখো
        </a>
      </div>
    </div>
  );
}
