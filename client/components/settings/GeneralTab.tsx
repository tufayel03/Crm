
import React, { useState, useRef, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { Save, Globe, Clock, Mail, CheckCircle2, FileText, Upload, Image as ImageIcon, Trash2, MapPin, Phone } from 'lucide-react';

const GeneralTab: React.FC = () => {
  const { generalSettings, updateGeneralSettings } = useSettingsStore();
  const [formData, setFormData] = useState(generalSettings);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(generalSettings);
  }, [generalSettings]);

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
    setSaveError(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          handleChange('logoUrl', ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateGeneralSettings(formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Regional Settings */}
        <div className="bg-white p-6 rounded-2xl border border-border">
          <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2 mb-6">
            <Globe size={20} className="text-primary" /> Regional Settings
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-textSecondary mb-1 flex items-center gap-2">
                <Clock size={14} /> Timezone
              </label>
              <select 
                value={formData.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="BST">BST (Bangladesh Standard Time - Dhaka)</option>
                <option value="EST">EST (Eastern Standard Time)</option>
                <option value="PST">PST (Pacific Standard Time)</option>
                <option value="GMT">GMT (Greenwich Mean Time)</option>
                <option value="CET">CET (Central European Time)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary mb-1">Currency</label>
              <select 
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="USD">USD ($) - United States Dollar</option>
                <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="AUD">AUD ($) - Australian Dollar</option>
                <option value="CAD">CAD ($) - Canadian Dollar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary mb-1">Date Format</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleChange('dateFormat', 'MM/DD/YYYY')}
                  className={`px-3 py-2 rounded-xl text-sm border transition-all ${formData.dateFormat === 'MM/DD/YYYY' ? 'bg-softMint border-primary text-darkGreen font-bold' : 'bg-slate-50 border-border text-textSecondary'}`}
                >
                  MM/DD/YYYY
                </button>
                <button 
                  onClick={() => handleChange('dateFormat', 'DD/MM/YYYY')}
                  className={`px-3 py-2 rounded-xl text-sm border transition-all ${formData.dateFormat === 'DD/MM/YYYY' ? 'bg-softMint border-primary text-darkGreen font-bold' : 'bg-slate-50 border-border text-textSecondary'}`}
                >
                  DD/MM/YYYY
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white p-6 rounded-2xl border border-border">
          <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2 mb-6">
            <Mail size={20} className="text-primary" /> Company Contact Info
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-textSecondary mb-1">Support Email</label>
              <input 
                type="email" 
                value={formData.supportEmail}
                onChange={(e) => handleChange('supportEmail', e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary mb-1">Phone Number</label>
              <input 
                type="text" 
                value={formData.companyPhone || ''}
                onChange={(e) => handleChange('companyPhone', e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                placeholder="+1 234 567 890"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary mb-1">Website</label>
              <input 
                type="text" 
                value={formData.companyWebsite || ''}
                onChange={(e) => handleChange('companyWebsite', e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                placeholder="www.yourcompany.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary mb-1">Public Tracking URL</label>
              <input 
                type="text" 
                value={formData.publicTrackingUrl || ''}
                onChange={(e) => handleChange('publicTrackingUrl', e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                placeholder="https://yourdomain.com"
              />
              <p className="text-[10px] text-textMuted mt-1">Used for open/click tracking. Must be publicly reachable.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary mb-1">Address</label>
              <textarea 
                value={formData.companyAddress || ''}
                onChange={(e) => handleChange('companyAddress', e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
                placeholder="123 Business St, City, Country"
              />
            </div>
          </div>
        </div>

        {/* Invoice Branding */}
        <div className="bg-white p-6 rounded-2xl border border-border md:col-span-2">
          <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2 mb-6">
            <FileText size={20} className="text-primary" /> Invoice Branding
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Logo Section */}
             <div>
                <label className="block text-xs font-bold text-textSecondary mb-2">Company Logo</label>
                <div className="flex items-start gap-4">
                    <div 
                        className="w-32 h-32 bg-slate-50 border-2 border-dashed border-border rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-100 overflow-hidden relative group"
                        onClick={() => logoInputRef.current?.click()}
                    >
                        {formData.logoUrl ? (
                            <>
                                <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-bold">Change</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-center">
                                <ImageIcon size={24} className="mx-auto text-textMuted mb-1" />
                                <span className="text-[10px] text-textSecondary font-bold">Upload</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-3">
                        <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                        <button 
                            onClick={() => logoInputRef.current?.click()}
                            className="px-4 py-2 bg-slate-100 text-textSecondary text-xs font-bold rounded-lg hover:bg-slate-200 flex items-center gap-2"
                        >
                            <Upload size={14} /> Upload Image
                        </button>
                        {formData.logoUrl && (
                            <button 
                                onClick={() => handleChange('logoUrl', '')}
                                className="px-4 py-2 bg-red-50 text-danger text-xs font-bold rounded-lg hover:bg-red-100 flex items-center gap-2"
                            >
                                <Trash2 size={14} /> Remove
                            </button>
                        )}
                        
                        <label className="flex items-center gap-2 cursor-pointer mt-2">
                            <input 
                                type="checkbox" 
                                checked={formData.invoiceUseLogo}
                                onChange={(e) => handleChange('invoiceUseLogo', e.target.checked)}
                                className="rounded text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-textSecondary">Use Logo on Invoices</span>
                        </label>
                    </div>
                </div>
             </div>

             {/* Footer Text */}
             <div>
                <label className="block text-xs font-bold text-textSecondary mb-2">Invoice Notes / Footer Text</label>
                <textarea 
                    value={formData.invoiceFooterText || ''}
                    onChange={(e) => handleChange('invoiceFooterText', e.target.value)}
                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm resize-none"
                    placeholder="e.g. We prioritize customer satisfaction..."
                />
                <p className="text-[10px] text-textMuted mt-1">This text appears at the bottom of the invoice.</p>
             </div>
          </div>
        </div>

      </div>

      {saveError && (
        <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {saveError}
        </div>
      )}

      <div className="flex justify-end pt-6">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 shadow-lg shadow-darkGreen/10 transition-all disabled:opacity-60"
        >
          {isSaved ? <CheckCircle2 size={20} /> : <Save size={20} />}
          {isSaving ? 'Saving...' : (isSaved ? 'Settings Saved' : 'Save Changes')}
        </button>
      </div>
    </div>
  );
};

export default GeneralTab;
