
import React, { useState, useEffect, useMemo } from 'react';
import { useMeetingsStore } from '../stores/meetingsStore';
import { useAuthStore } from '../stores/authStore';
import { useClientsStore } from '../stores/clientsStore';
import { 
  Calendar, Video, Clock, CheckCircle2 
} from 'lucide-react';
import { Meeting } from '../types';

// Buffer time in milliseconds (30 seconds)
const JOIN_BUFFER_MS = 30000;

const CountdownTimer: React.FC<{ targetDate: Date, onReady: () => void }> = ({ targetDate, onReady }) => {
    const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +targetDate - +new Date();
            
            // If meeting is within buffer or passed, allow joining
            if (difference < JOIN_BUFFER_MS) { 
                onReady();
                return null;
            }

            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60)
            };
        };

        // Initial call
        const initial = calculateTimeLeft();
        if (initial) setTimeLeft(initial);

        const timer = setInterval(() => {
            const tl = calculateTimeLeft();
            setTimeLeft(tl);
            if (!tl) clearInterval(timer);
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate, onReady]);

    if (!timeLeft) return null;

    return (
        <div className="grid grid-cols-4 gap-2 text-center my-4">
            <div className="bg-slate-100 p-2 rounded-lg">
                <span className="block text-xl font-bold text-textPrimary">{timeLeft.days}</span>
                <span className="text-[10px] text-textMuted uppercase">Days</span>
            </div>
            <div className="bg-slate-100 p-2 rounded-lg">
                <span className="block text-xl font-bold text-textPrimary">{timeLeft.hours}</span>
                <span className="text-[10px] text-textMuted uppercase">Hrs</span>
            </div>
            <div className="bg-slate-100 p-2 rounded-lg">
                <span className="block text-xl font-bold text-textPrimary">{timeLeft.minutes}</span>
                <span className="text-[10px] text-textMuted uppercase">Mins</span>
            </div>
            <div className="bg-slate-100 p-2 rounded-lg">
                <span className="block text-xl font-bold text-textPrimary">{timeLeft.seconds}</span>
                <span className="text-[10px] text-textMuted uppercase">Secs</span>
            </div>
        </div>
    );
};

const ClientMeetingCard: React.FC<{ meeting: Meeting }> = ({ meeting }) => {
    const meetingDate = new Date(`${meeting.date}T${meeting.time}`);
    const [isReadyToJoin, setIsReadyToJoin] = useState(false);
    const hasJoinLink = Boolean(meeting.link && !meeting.link.includes('/meeting/'));

    // Initial check on mount
    useEffect(() => {
        const diff = +meetingDate - +new Date();
        if (diff < JOIN_BUFFER_MS) setIsReadyToJoin(true);
    }, [meetingDate]);

    const handleJoin = () => {
        if (hasJoinLink && meeting.link) {
            window.open(meeting.link, '_blank');
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="inline-block px-2 py-1 bg-softMint text-darkGreen text-[10px] font-bold uppercase rounded-md mb-2">
                        {meeting.type}
                    </span>
                    <h3 className="font-bold text-lg text-textPrimary leading-tight">{meeting.title}</h3>
                </div>
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-darkGreen border border-slate-100">
                    <span className="text-xs font-bold uppercase">{meetingDate.toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-xl font-bold">{meetingDate.getDate()}</span>
                </div>
            </div>

            <p className="text-sm text-textSecondary mb-6 flex-1">{meeting.agenda || 'No agenda provided.'}</p>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-textMuted">
                    <Clock size={16} />
                    <span>{meeting.time} (BD Time) • {meeting.duration} min</span>
                </div>

                {!isReadyToJoin ? (
                    <div className="bg-slate-50 rounded-xl p-3 border border-border">
                        <p className="text-xs text-center font-bold text-textSecondary mb-2">Starts In:</p>
                        <CountdownTimer targetDate={meetingDate} onReady={() => setIsReadyToJoin(true)} />
                    </div>
                ) : (
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center mb-2">
                        <p className="text-xs font-bold text-green-700 flex items-center justify-center gap-1">
                            <CheckCircle2 size={14} /> Ready to start
                        </p>
                    </div>
                )}

                <button 
                    onClick={handleJoin}
                    disabled={!hasJoinLink || (!isReadyToJoin && !meeting.link)}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        isReadyToJoin 
                        ? 'bg-darkGreen text-white hover:bg-opacity-90 shadow-lg shadow-darkGreen/20' 
                        : 'bg-slate-100 text-textMuted cursor-not-allowed'
                    }`}
                >
                    <Video size={18} />
                    {isReadyToJoin ? 'Join Meeting Now' : 'Join Enabled Soon'}
                </button>
            </div>
        </div>
    );
};

const ClientMeetings: React.FC = () => {
  const { meetings } = useMeetingsStore();
  const { user } = useAuthStore();
  const { clients } = useClientsStore();

  // Find current client ID based on user email
  const client = useMemo(() => clients.find(c => c.email.toLowerCase() === user?.email.toLowerCase()), [clients, user]);

  const myMeetings = useMemo(() => {
      if (!client) return [];
      const now = new Date();
      return meetings.filter(m => {
          // Check association via ID or Email
          const isMyMeeting = m.leadId === client.id; 
          const meetingDate = new Date(`${m.date}T${m.time}`);
          // Only show future meetings or recent past (e.g. within last hour)
          const isRelevant = meetingDate.getTime() > (now.getTime() - 3600000); 
          
          return isMyMeeting && isRelevant && m.status !== 'Cancelled';
      }).sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
  }, [meetings, client]);

  if (!client) {
      return <div className="p-8 text-center">Loading client profile...</div>;
  }

  return (
    <div className="space-y-8 pb-20">
        <div>
            <h2 className="text-2xl font-bold text-textPrimary">Scheduled Meetings</h2>
            <p className="text-textSecondary">Upcoming sessions with your account manager.</p>
        </div>

        {myMeetings.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-border rounded-2xl p-12 text-center">
                <Calendar size={48} className="mx-auto mb-4 text-textMuted opacity-50" />
                <h3 className="text-lg font-bold text-textPrimary">No Meetings Scheduled</h3>
                <p className="text-textSecondary">You don't have any upcoming meetings at the moment.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myMeetings.map(meeting => (
                    <ClientMeetingCard key={meeting.id} meeting={meeting} />
                ))}
            </div>
        )}

    </div>
  );
};

export default ClientMeetings;
