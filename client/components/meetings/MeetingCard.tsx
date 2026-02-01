
import React, { useState, useEffect } from 'react';
import { Meeting } from '../../types';
import { Video, User, Edit2, Trash2, Clock } from 'lucide-react';

interface MeetingCardProps {
  meeting: Meeting;
  onEdit: (meeting: Meeting) => void;
  onDelete: (meeting: Meeting) => void;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onEdit, onDelete }) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const hasJoinLink = Boolean(meeting.link && !meeting.link.includes('/meeting/'));

  const getPlatformIcon = (p: string) => {
    switch(p) {
      case 'Google Meet': return <Video size={16} />;
      case 'Zoom': return <Video size={16} />;
      default: return <User size={16} />;
    }
  };

  useEffect(() => {
    const meetingDate = new Date(`${meeting.date}T${meeting.time}`);
    
    const updateTimer = () => {
      const now = new Date();
      const diff = meetingDate.getTime() - now.getTime();

      // For Admins/Agents, "Active" state is just visual preference (e.g. pulse)
      // but they can click join anytime.
      // We consider it "active" if within 15 min or ongoing.
      if (diff <= 15 * 60 * 1000 && diff > -2 * 60 * 60 * 1000) {
        setIsActive(true);
      } else {
        setIsActive(false);
      }

      // Calculate Countdown if within 24 hours
      if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
        const hrs = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
      } else {
        setTimeLeft(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [meeting.date, meeting.time]);

  const handleJoin = () => {
    if (hasJoinLink && meeting.link) {
      window.open(meeting.link, '_blank');
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6 group relative overflow-hidden">
      {isActive && (
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary animate-pulse"></div>
      )}
      
      <div className="flex flex-col items-center justify-center min-w-[80px] p-4 bg-softMint/20 rounded-xl border border-primary/20 text-darkGreen">
        <span className="text-xs font-bold uppercase tracking-wider">{new Date(meeting.date).toLocaleString('default', { month: 'short' })}</span>
        <span className="text-2xl font-bold">{new Date(meeting.date).getDate()}</span>
        <span className="text-xs font-medium">{meeting.time}</span>
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-textSecondary uppercase tracking-wider mb-2">
              {meeting.type}
            </span>
            <h3 className="text-xl font-bold text-textPrimary">{meeting.title}</h3>
          </div>
          <div className="flex gap-2">
            {hasJoinLink ? (
               <button 
                  onClick={handleJoin} 
                  className="flex items-center gap-2 px-4 py-2 bg-darkGreen text-white font-bold rounded-lg shadow-lg hover:bg-opacity-90 transition-all animate-in fade-in"
                  title="Admins can join anytime"
               >
                  <Video size={16} /> Join Now
               </button>
            ) : (
              <span className="px-3 py-2 bg-slate-50 text-textMuted text-xs font-bold rounded-lg border border-border">
                {meeting.link ? 'Update Link' : 'No Link'}
              </span>
            )}
            
            <button 
              onClick={() => onEdit(meeting)}
              className="p-2 text-textMuted hover:text-info hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Meeting"
            >
              <Edit2 size={20} />
            </button>
            <button 
              onClick={() => onDelete(meeting)}
              className="p-2 text-textMuted hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Meeting"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-end">
            <p className="text-sm text-textSecondary">{meeting.agenda}</p>
            {timeLeft && (
                <div className="text-right">
                    <p className="text-[10px] font-bold text-textMuted uppercase">Starts In</p>
                    <p className="text-sm font-mono font-bold text-primary">{timeLeft}</p>
                </div>
            )}
        </div>
        
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-textSecondary">
            <User size={16} className="text-textMuted" />
            <span>{meeting.leadName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-textSecondary">
            <Clock size={16} className="text-textMuted" />
            <span>{meeting.duration} min</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-textSecondary">
            {getPlatformIcon(meeting.platform)}
            <span>{meeting.platform}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-textMuted ml-auto">
             <span>BD Time (Dhaka)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingCard;
