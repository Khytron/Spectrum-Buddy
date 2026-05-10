import React, { useEffect, useState } from 'react';
import browser from '../utils/browser-polyfill';

const formatDueDate = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleString([], { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const formatOffset = (minutes) => {
  const offset = parseInt(minutes, 10);
  if (offset <= 0) return 'now';
  
  if (offset % 1440 === 0) {
    const days = offset / 1440;
    return days === 1 ? '1 day' : `${days} days`;
  }
  
  if (offset >= 60) {
    const hours = Math.round(offset / 60);
    return hours === 1 ? '1 hour' : `${hours}h`;
  }
  
  return `${offset}m`;
};

function App() {
  const [params, setParams] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setParams({
      title: urlParams.get('title') || 'Upcoming Deadline',
      course: urlParams.get('course') || 'Unknown Course',
      dueDate: urlParams.get('dueDate') || new Date().toISOString(),
      link: urlParams.get('link') || 'https://spectrum.um.edu.my',
      offset: urlParams.get('offset') || '0',
    });
  }, []);

  if (!params) return null;

  const handleOpenAssignment = () => {
    window.location.href = params.link;
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f7ff] flex flex-col items-center justify-center p-4 font-sans text-[#1e293b]">
      <audio src="/audio/reminder.mp3" autoPlay loop={!isMuted} muted={isMuted} />

      {/* Main Container - Minimalist like the screenshot */}
      <div className="w-full max-w-2xl flex flex-col items-center">
        
        {/* Simple Title */}
        <h1 className="text-5xl md:text-6xl font-medium mb-6 text-center leading-tight">
          {params.title}
        </h1>

        {/* Informative Subtitle */}
        <p className="text-lg md:text-xl text-[#64748b] mb-12 text-center">
          Due in {formatOffset(params.offset)} — {params.course}
        </p>

        {/* High-Impact Action Button (Green like the example) */}
        <button
          onClick={handleOpenAssignment}
          className="bg-[#22c55e] hover:bg-[#16a34a] text-white text-2xl font-bold py-5 px-12 rounded-full transition-all active:scale-95 shadow-lg mb-10"
        >
          Go to Spectrum
        </button>

        {/* Secondary Info/Actions */}
        <div className="flex flex-col items-center gap-6">
          <div className="bg-[#e2e8f0] py-3 px-8 rounded-2xl text-[#475569] font-medium">
            Deadline: {formatDueDate(params.dueDate)}
          </div>
          
          <button
            onClick={() => window.close()}
            className="text-[#94a3b8] hover:text-[#64748b] font-bold tracking-wide uppercase text-sm"
          >
            Dismiss
          </button>
        </div>

        {/* Audio Toggle (Subtle) */}
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="absolute bottom-10 right-10 p-2 text-[#cbd5e1] hover:text-[#94a3b8] transition-colors"
        >
          {isMuted ? 'UNMUTE' : 'MUTE'}
        </button>
      </div>
    </div>
  );
}

export default App;
