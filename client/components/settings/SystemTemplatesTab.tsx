
import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { Save, CheckCircle2, FileText, Info } from 'lucide-react';
import { SystemTemplates } from '../../types';

const SystemTemplatesTab: React.FC = () => {
  const { systemTemplates, updateSystemTemplate } = useSettingsStore();
  const [selectedType, setSelectedType] = useState<keyof SystemTemplates>('invoice');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Load template on selection change
  useEffect(() => {
      const template = systemTemplates[selectedType];
      setSubject(template.subject);
      setBody(template.body);
      setIsSaved(false);
  }, [selectedType, systemTemplates]);

  const handleSave = () => {
      updateSystemTemplate(selectedType, { subject, body });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
  };

  const getPlaceholders = (type: keyof SystemTemplates) => {
      const common = ['{{company_name}}'];
      switch (type) {
          case 'invoice':
              return [...common, '{{client_name}}', '{{invoice_id}}', '{{amount}}', '{{due_date}}', '{{service}}'];
          case 'meetingSchedule':
          case 'meetingUpdate':
          case 'meetingCancel':
              return [...common, '{{participant_name}}', '{{meeting_title}}', '{{date}}', '{{time}}', '{{link}}', '{{host_name}}', '{{duration}}', '{{agenda}}'];
          case 'passwordReset':
              return [...common, '{{name}}', '{{link}}'];
          default:
              return common;
      }
  };

  const OPTIONS: { value: keyof SystemTemplates; label: string }[] = [
      { value: 'invoice', label: 'Invoice Notification' },
      { value: 'meetingSchedule', label: 'Meeting Scheduled' },
      { value: 'meetingUpdate', label: 'Meeting Updated' },
      { value: 'meetingCancel', label: 'Meeting Cancelled' },
      { value: 'passwordReset', label: 'Password Reset Request' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                    <FileText size={20} className="text-primary" /> System Email Templates
                </h3>
                <p className="text-sm text-textSecondary mt-1">
                    Customize the automated emails sent by the system.
                </p>
            </div>
            
            <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as keyof SystemTemplates)}
                className="px-4 py-2 border border-border rounded-lg bg-slate-50 text-sm font-bold text-textPrimary outline-none focus:border-primary min-w-[200px]"
            >
                {OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>

        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-textSecondary mb-1">Email Subject</label>
                <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-textSecondary mb-1">Email Body (HTML Supported)</label>
                <textarea 
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none min-h-[300px] font-mono text-sm leading-relaxed"
                />
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h4 className="text-xs font-bold text-blue-800 flex items-center gap-2 mb-2">
                    <Info size={14} /> Available Placeholders
                </h4>
                <div className="flex flex-wrap gap-2">
                    {getPlaceholders(selectedType).map(ph => (
                        <code key={ph} className="bg-white px-2 py-1 rounded border border-blue-100 text-xs text-blue-700 font-mono">
                            {ph}
                        </code>
                    ))}
                </div>
            </div>
        </div>

        <div className="flex justify-end pt-6">
            <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-8 py-3 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 shadow-lg shadow-darkGreen/10 transition-all"
            >
            {isSaved ? <CheckCircle2 size={20} /> : <Save size={20} />}
            {isSaved ? 'Template Saved' : 'Save Template'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default SystemTemplatesTab;
