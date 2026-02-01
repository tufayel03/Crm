
import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Repeat, Clock, CheckCircle2 } from 'lucide-react';
import { ServicePlan, ServiceSubscription, SubscriptionStatus } from '../../types';

interface ServiceFormModalProps {
  initialData?: ServiceSubscription;
  plans: ServicePlan[];
  onClose: () => void;
  onSave: (data: any) => void;
}

const ServiceFormModal: React.FC<ServiceFormModalProps> = ({ initialData, plans, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    planId: '',
    customName: '',
    price: 0,
    duration: 30,
    billingCycle: 'monthly' as 'monthly' | 'one-time',
    startDate: new Date().toISOString().split('T')[0],
    status: 'Active' as SubscriptionStatus
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        planId: '', // Custom handling or matching plan ID not strictly necessary for edit
        customName: initialData.type,
        price: initialData.price,
        duration: initialData.duration,
        billingCycle: initialData.billingCycle || 'monthly',
        startDate: new Date(initialData.startDate).toISOString().split('T')[0],
        status: initialData.status
      });
    }
  }, [initialData]);

  const handlePlanSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const planId = e.target.value;
      const plan = plans.find(p => p.id === planId);
      
      if (plan) {
          setFormData({
              ...formData,
              planId: plan.id,
              customName: plan.name,
              price: plan.price,
              duration: plan.duration,
              billingCycle: plan.billingCycle
          });
      } else {
          setFormData({
              ...formData,
              planId: '',
              customName: '',
              price: 0,
              duration: 30,
              billingCycle: 'monthly'
          });
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-textPrimary">{initialData ? 'Edit Service' : 'Add Active Service'}</h3>
          <button onClick={onClose} className="text-textMuted hover:text-danger">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!initialData && (
            <div>
                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Select Plan</label>
                <select 
                    value={formData.planId}
                    onChange={handlePlanSelection}
                    className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                >
                    <option value="">-- Custom / Select Plan --</option>
                    {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (${p.price} {p.billingCycle === 'one-time' ? 'One-time' : 'Monthly'})</option>
                    ))}
                </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Service Name</label>
            <input 
              type="text" 
              value={formData.customName}
              onChange={(e) => setFormData({...formData, customName: e.target.value})}
              className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              placeholder="e.g. Special SEO Project"
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Price ($)</label>
              <input 
                type="number" 
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Duration (Days)</label>
              <input 
                type="number" 
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                required 
              />
            </div>
          </div>

          {/* Billing Cycle Selection */}
          <div>
              <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Billing Type</label>
              <select 
                  value={formData.billingCycle}
                  onChange={(e) => setFormData({...formData, billingCycle: e.target.value as any})}
                  className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              >
                  <option value="monthly">Monthly / Recurring</option>
                  <option value="one-time">One-time Fee</option>
              </select>
          </div>

          <div>
              <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Start Date</label>
              <input 
                type="date" 
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                required 
              />
          </div>

          {initialData && (
             <div>
                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Status</label>
                <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                >
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full py-3 mt-4 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} /> {initialData ? 'Update Subscription' : 'Add Subscription'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ServiceFormModal;
