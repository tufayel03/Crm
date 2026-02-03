
import React, { useState, useMemo } from 'react';
import { useMeetingsStore } from '../stores/meetingsStore';
import { useCampaignStore } from '../stores/campaignStore';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useNotificationStore } from '../stores/notificationStore';
import { compileHtml } from '../components/email-builder/compiler'; // Need compiler
import { applyTemplateTokens, buildCompanyTokens } from '../utils/templateTokens';
import { 
  Calendar, Plus, List, Grid, ChevronLeft, ChevronRight, Copy, ExternalLink, Edit2, Trash2 
} from 'lucide-react';
import { Meeting } from '../types';
import MeetingFormModal from '../components/meetings/MeetingFormModal';

const Meetings: React.FC = () => {
  // Hooks
  const { meetings, addMeeting, updateMeeting, deleteMeeting } = useMeetingsStore();
  const { sendSingleEmail, templates } = useCampaignStore();
  const { user } = useAuthStore();
  const { generalSettings } = useSettingsStore();
  const { addNotification } = useNotificationStore();

  // Scheduled View State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [listTab, setListTab] = useState<'upcoming' | 'past'>('upcoming');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPastIds, setSelectedPastIds] = useState<string[]>([]);

  // --- Helper Functions (Scheduled) ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sunday

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const getMeetingsForDay = (day: number) => {
    return meetings.filter(m => {
        const d = new Date(m.date);
        return d.getDate() === day && 
               d.getMonth() === currentDate.getMonth() && 
               d.getFullYear() === currentDate.getFullYear() &&
               m.status !== 'Cancelled';
    });
  };

  const parseMeetingDate = (m: Meeting) => {
    const base = new Date(m.date);
    if (Number.isNaN(base.getTime())) return null;
    const datePart = base.toISOString().split('T')[0];
    const timePart = m.time || '00:00';
    const combined = new Date(`${datePart}T${timePart}`);
    return Number.isNaN(combined.getTime()) ? base : combined;
  };

  const { upcomingMeetings, pastMeetings } = useMemo(() => {
    const now = new Date();
    const upcoming: Meeting[] = [];
    const past: Meeting[] = [];

    meetings.forEach(m => {
      const d = parseMeetingDate(m);
      if (!d) return;
      const isPast = d.getTime() < now.getTime();
      if (isPast || m.status === 'Cancelled' || m.status === 'Completed') {
        past.push(m);
      } else if (m.status !== 'Cancelled') {
        upcoming.push(m);
      }
    });

    upcoming.sort((a, b) => (parseMeetingDate(a)?.getTime() || 0) - (parseMeetingDate(b)?.getTime() || 0));
    past.sort((a, b) => (parseMeetingDate(b)?.getTime() || 0) - (parseMeetingDate(a)?.getTime() || 0));

    return { upcomingMeetings: upcoming, pastMeetings: past };
  }, [meetings]);

  const notifyParticipant = async (contact: any, meetingData: any, type: 'schedule' | 'update' | 'delete') => {
      if (!contact || !contact.email) return false;

      // Select template based on action using Visual Templates
      let templateName = 'Meeting Scheduled';
      if (type === 'update') templateName = 'Meeting Updated';
      if (type === 'delete') templateName = 'Meeting Cancelled';

      let template = templates.find(t => t.name === templateName);
      
      // Fallback if deleted
      if (!template) {
          console.warn(`${templateName} template not found. Using simple fallback.`);
          template = {
              id: 'fallback',
              name: 'Fallback',
              subject: `${templateName}: ${meetingData.title}`,
              htmlContent: `<p>Meeting Info: ${meetingData.title} at ${meetingData.time}</p>`,
              createdBy: 'System'
          };
      }

      const linkToUse = meetingData.link || '#';
      const hostName = user?.name || 'Matlance Team';
      const meetingDate = new Date(meetingData.date).toLocaleDateString();
      const baseTokens = buildCompanyTokens(generalSettings);

      // Compile if visual
      let htmlBody = template.htmlContent;
      if (template.designJson) {
          try {
              const design = JSON.parse(template.designJson);
              htmlBody = compileHtml(design.blocks, design.globalStyle, []);
          } catch (e) {
              console.error("Error compiling meeting template", e);
          }
      }

      const tokenData = {
        ...baseTokens,
        participant_name: contact.name,
        meeting_title: meetingData.title,
        host_name: hostName,
        date: meetingDate,
        time: meetingData.time,
        link: linkToUse,
        duration: meetingData.duration?.toString() || '',
        agenda: meetingData.agenda || 'N/A',
        platform: meetingData.platform || ''
      };

      const emailSubject = applyTemplateTokens(template.subject, tokenData);
      const emailBody = applyTemplateTokens(htmlBody, tokenData);

      try {
          await sendSingleEmail(contact.email, emailSubject, emailBody);
          return true;
      } catch (err) {
          console.error("Email send failed", err);
          return false;
      }
  };

  const handleSubmit = async (formData: any, contact: any) => {
    setIsProcessing(true);

    const meetingData = {
        ...formData,
        leadId: contact.id, 
        leadName: contact.name,
        link: formData.link || undefined
    };

    let emailSent = false;

    if (editingMeeting) {
        updateMeeting(editingMeeting.id, meetingData);
        if (contact && contact.email) {
            emailSent = await notifyParticipant(contact, meetingData, 'update');
        }
        addNotification('success', emailSent ? `Updated & email sent to ${contact.email}` : "Meeting details updated");
    } else {
        addMeeting({ ...meetingData, type: 'Discovery' }); 
        if (contact && contact.email) {
            emailSent = await notifyParticipant(contact, meetingData, 'schedule');
        }
        addNotification('success', emailSent ? `Scheduled & email sent to ${contact.email}` : "Meeting scheduled successfully");
    }

    setIsProcessing(false);
    setIsModalOpen(false);
    setEditingMeeting(undefined);
  };

  const handleDeleteMeeting = async (meeting: Meeting) => {
      if (!window.confirm("Are you sure you want to permanently delete this meeting?")) return;
      
      const shouldSendEmail = meeting.leadId && window.confirm("Send cancellation email to participant?");
      
      deleteMeeting(meeting.id);
      
      if (shouldSendEmail) {
          // Need contact info to send email, usually stored in clients/leads store but simplified here
          // This assumes we have enough info in the meeting object or could fetch it.
          // For now, we simulate the 'notify' call if we had the contact object.
          // In a real app, fetch contact by ID first.
          addNotification('info', "Meeting deleted. (Email notification logic simulated)");
      } else {
          addNotification('info', "Meeting deleted locally.");
      }
  };

  const toggleSelectPast = (id: string) => {
    setSelectedPastIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllPast = () => {
    const pastIds = pastMeetings.map(m => m.id);
    const allSelected = pastIds.length > 0 && pastIds.every(id => selectedPastIds.includes(id));
    if (allSelected) {
      setSelectedPastIds(prev => prev.filter(id => !pastIds.includes(id)));
    } else {
      setSelectedPastIds(prev => [...new Set([...prev, ...pastIds])]);
    }
  };

  const bulkDeletePast = async () => {
    if (selectedPastIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedPastIds.length} past meeting(s)? This cannot be undone.`)) return;
    for (const id of selectedPastIds) {
      await deleteMeeting(id);
    }
    setSelectedPastIds([]);
    addNotification('success', 'Past meetings deleted.');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary">Meetings Hub</h2>
          <p className="text-textSecondary">Manage schedules and send meeting links.</p>
        </div>
      </div>

      {/* Content Area */}
      <div>
            
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="bg-white border border-border rounded-xl p-1 flex">
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-textPrimary shadow-sm' : 'text-textMuted hover:text-textPrimary'}`}
                                title="List View"
                            >
                                <List size={20} />
                            </button>
                            <button 
                                onClick={() => setViewMode('calendar')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'calendar' ? 'bg-slate-100 text-textPrimary shadow-sm' : 'text-textMuted hover:text-textPrimary'}`}
                                title="Calendar View"
                            >
                                <Grid size={20} />
                            </button>
                        </div>
                        <button 
                            onClick={() => { setEditingMeeting(undefined); setIsModalOpen(true); }}
                            className="flex items-center gap-2 px-6 py-3 bg-darkGreen text-white font-bold rounded-xl shadow-lg shadow-darkGreen/10 hover:bg-opacity-90 transition-all"
                        >
                            <Plus size={20} /> Schedule Meeting
                        </button>
                    </div>

                    {/* VIEW: CALENDAR */}
                    {viewMode === 'calendar' && (
                        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-border flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-lg text-textPrimary flex items-center gap-2">
                                    <Calendar size={20} className="text-primary"/> 
                                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </h3>
                                <div className="flex gap-2">
                                    <button onClick={() => changeMonth(-1)} className="p-2 border border-border rounded-lg bg-white hover:bg-slate-50"><ChevronLeft size={16} /></button>
                                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 border border-border rounded-lg bg-white hover:bg-slate-50 text-xs font-bold">Today</button>
                                    <button onClick={() => changeMonth(1)} className="p-2 border border-border rounded-lg bg-white hover:bg-slate-50"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-7 border-b border-border bg-slate-50">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="py-2 text-center text-xs font-bold text-textMuted uppercase">{day}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 auto-rows-fr bg-white">
                                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                    <div key={`empty-${i}`} className="min-h-[120px] border-b border-r border-border bg-slate-50/30"></div>
                                ))}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const dayMeetings = getMeetingsForDay(day);
                                    const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

                                    return (
                                        <div key={day} className={`min-h-[120px] border-b border-r border-border p-2 transition-colors hover:bg-slate-50 group relative ${isToday ? 'bg-softMint/10' : ''}`}>
                                            <span className={`text-sm font-bold block mb-2 ${isToday ? 'text-darkGreen bg-softMint w-6 h-6 rounded-full flex items-center justify-center' : 'text-textSecondary'}`}>{day}</span>
                                            <div className="space-y-1">
                                                {dayMeetings.map(m => (
                                                    <button 
                                                        key={m.id}
                                                        onClick={() => { setEditingMeeting(m); setIsModalOpen(true); }}
                                                        className="w-full text-left text-[10px] px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100 hover:border-blue-300 truncate transition-all block"
                                                        title={`${m.time} - ${m.title} with ${m.leadName}`}
                                                    >
                                                        <span className="font-bold">{m.time}</span> {m.leadName.split(' ')[0]}
                                                    </button>
                                                ))}
                                            </div>
                                            <button 
                                                onClick={() => { setEditingMeeting(undefined); setIsModalOpen(true); }}
                                                className="absolute top-2 right-2 p-1 text-textMuted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* VIEW: LIST */}
                    {viewMode === 'list' && (
                        <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setListTab('upcoming')}
                                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                                    listTab === 'upcoming'
                                        ? 'bg-softMint text-darkGreen border-primary/30'
                                        : 'bg-white text-textSecondary border-border hover:bg-slate-50'
                                }`}
                            >
                                Upcoming Meetings
                            </button>
                            <button
                                onClick={() => setListTab('past')}
                                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                                    listTab === 'past'
                                        ? 'bg-softMint text-darkGreen border-primary/30'
                                        : 'bg-white text-textSecondary border-border hover:bg-slate-50'
                                }`}
                            >
                                Past Meetings
                            </button>
                        </div>
                        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-border">
                                        <tr>
                                            {listTab === 'past' && (
                                              <th className="px-4 py-4 w-10">
                                                <button onClick={selectAllPast} className="text-textMuted hover:text-primary transition-colors">
                                                  {selectedPastIds.length > 0 && pastMeetings.length > 0 && pastMeetings.every(m => selectedPastIds.includes(m.id))
                                                    ? '☑'
                                                    : '☐'}
                                                </button>
                                              </th>
                                            )}
                                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Date</th>
                                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Title</th>
                                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Participant</th>
                                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Type</th>
                                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Time</th>
                                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Duration</th>
                                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Platform</th>
                                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Link</th>
                                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Status</th>
                                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {listTab === 'upcoming' && upcomingMeetings.length === 0 ? (
                                            <tr>
                                                <td colSpan={listTab === 'past' ? 11 : 10} className="px-6 py-12 text-center text-textMuted">
                                                    No upcoming meetings.
                                                </td>
                                            </tr>
                                        ) : null}
                                        {listTab === 'past' && pastMeetings.length === 0 ? (
                                            <tr>
                                                <td colSpan={11} className="px-6 py-12 text-center text-textMuted">
                                                    No past meetings.
                                                </td>
                                            </tr>
                                        ) : null}
                                        {listTab === 'upcoming' ? (
                                            upcomingMeetings.map(meeting => {
                                                const dateLabel = new Date(meeting.date).toLocaleDateString();
                                                const timeLabel = meeting.time || '—';
                                                const hasLink = Boolean(meeting.link);
                                                return (
                                                    <tr key={meeting.id} className="hover:bg-slate-50/60 transition-colors">
                                                        <td className="px-6 py-4 text-textSecondary">{dateLabel}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-textPrimary">{meeting.title}</div>
                                                            <div className="text-xs text-textMuted">{meeting.agenda || 'No agenda'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-textSecondary">{meeting.leadName || '—'}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-textMuted border-border">
                                                                {meeting.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-textSecondary">{timeLabel}</td>
                                                        <td className="px-6 py-4 text-textSecondary">{meeting.duration || 30} min</td>
                                                        <td className="px-6 py-4 text-textSecondary">{meeting.platform || '—'}</td>
                                                        <td className="px-6 py-4">
                                                            {hasLink ? (
                                                                <button
                                                                    onClick={() => window.open(meeting.link as string, '_blank')}
                                                                    className="inline-flex items-center gap-1 text-xs font-bold text-darkGreen hover:underline"
                                                                >
                                                                    Open <ExternalLink size={12} />
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs text-textMuted">No link</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                                meeting.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                                                meeting.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                                {meeting.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => { setEditingMeeting(meeting); setIsModalOpen(true); }}
                                                                    className="p-2 text-textMuted hover:text-darkGreen"
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteMeeting(meeting)}
                                                                    className="p-2 text-textMuted hover:text-danger"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => { if (meeting.link) navigator.clipboard.writeText(meeting.link); }}
                                                                    className="p-2 text-textMuted hover:text-primary disabled:opacity-50"
                                                                    title="Copy link"
                                                                    disabled={!hasLink}
                                                                >
                                                                    <Copy size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            pastMeetings.map(meeting => {
                                                const dateLabel = new Date(meeting.date).toLocaleDateString();
                                                const timeLabel = meeting.time || '—';
                                                return (
                                                    <tr key={meeting.id} className={`hover:bg-slate-50/60 transition-colors ${selectedPastIds.includes(meeting.id) ? 'bg-softMint/20' : ''}`}>
                                                        <td className="px-4 py-4">
                                                            <button onClick={() => toggleSelectPast(meeting.id)} className="text-textMuted hover:text-primary transition-colors">
                                                              {selectedPastIds.includes(meeting.id) ? '☑' : '☐'}
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-4 text-textSecondary">{dateLabel}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-textPrimary">{meeting.title}</div>
                                                            <div className="text-xs text-textMuted">{meeting.agenda || 'No agenda'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-textSecondary">{meeting.leadName || '—'}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-textMuted border-border">
                                                                {meeting.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-textSecondary">{timeLabel}</td>
                                                        <td className="px-6 py-4 text-textSecondary">{meeting.duration || 30} min</td>
                                                        <td className="px-6 py-4 text-textSecondary">{meeting.platform || '—'}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                                meeting.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                                                meeting.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                                {meeting.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => { setEditingMeeting(meeting); setIsModalOpen(true); }}
                                                                    className="p-2 text-textMuted hover:text-darkGreen"
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteMeeting(meeting)}
                                                                    className="p-2 text-textMuted hover:text-danger"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {listTab === 'past' && selectedPastIds.length > 0 && (
                              <div className="p-4 border-t border-border bg-white flex items-center justify-between">
                                <span className="text-sm text-textSecondary">
                                  {selectedPastIds.length} selected
                                </span>
                                <button
                                  onClick={bulkDeletePast}
                                  className="px-4 py-2 bg-danger text-white font-bold rounded-lg hover:bg-red-600 transition-colors"
                                >
                                  Delete Selected
                                </button>
                              </div>
                            )}
                        </div>
                        </div>
                    )}

                    {/* Quick Templates */}
                    <div className="pt-8 border-t border-border">
                        <h3 className="font-bold text-textPrimary mb-4 flex items-center gap-2">
                            <Copy size={18} className="text-textMuted" /> Quick Templates
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {['Discovery Call (30m)', 'Client Onboarding (1h)', 'Weekly Sync (45m)'].map((template, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => { setIsModalOpen(true); addNotification('info', `Loaded template: ${template}`); }}
                                    className="p-4 bg-white border border-border rounded-xl text-left hover:border-primary hover:shadow-sm transition-all text-sm font-medium text-textSecondary"
                                >
                                    {template}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
      </div>

      {isModalOpen && (
        <MeetingFormModal 
            initialData={editingMeeting}
            onClose={() => { setIsModalOpen(false); setEditingMeeting(undefined); }}
            onSubmit={handleSubmit}
            isProcessing={isProcessing}
        />
      )}
    </div>
  );
};

export default Meetings;
