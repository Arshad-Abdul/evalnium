import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { speakText, stopSpeech } from '../../utils/speech';

interface AudioPlayerButtonProps {
  textToRead: string;
  className?: string;
  label?: string;
}

export const AudioPlayerButton: React.FC<AudioPlayerButtonProps> = ({
  textToRead,
  className = '',
  label = 'Read Out Loud'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying) {
      stopSpeech();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speakText(textToRead, () => {
        setIsPlaying(false);
      });
    }
  };

  return (
    <button
      onClick={handleToggle}
      type="button"
      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
        isPlaying
          ? 'bg-amber-500 text-white animate-pulse shadow-xs'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
      } ${className}`}
      title={isPlaying ? 'Stop Audio Reader' : 'Listen to question out loud'}
    >
      {isPlaying ? (
        <>
          <VolumeX className="w-3.5 h-3.5" />
          <span>Stop Audio</span>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5 text-blue-600" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
