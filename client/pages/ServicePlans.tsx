
import React, { useState, useEffect } from 'react';
import { useServicesStore } from '../stores/servicesStore';
import { 
  Package, Plus, DollarSign, Calendar, 
  Trash2, X, CheckCircle2, Edit2, Clock, Repeat
} from 'lucide-react';
import { ServicePlan } from '../types';

const ServicePlans: React.FC = () => {
  const { plans, addPlan, removePlan, updatePlan, fetchPlans } = useServicesStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<ServicePlan, 'id'>>({
    name: '',
    price: 0,
    duration: 30,
    billingCycle: 'monthly',
    description: '',
    features: []
  });
  
  const [featureInput, setFeatureInput] = useState('');

  useEffect(() => {
    fetchPlans();
    const interval = setInterval(() => fetchPlans(), 30000);
    return () => clearInterval(interval);
  }, [fetchPlans]);

  const handleOpenModal = (plan?: ServicePlan) => {
    if (plan) {
      setEditingId(plan.id);
      setFormData({
        name: plan.name,
        price: plan.price,
        duration: plan.duration,
        billingCycle: plan.billingCycle || 'monthly',
        description: plan.description,
        features: plan.features
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        price: 0,
        duration: 30,
        billingCycle: 'monthly',
        description: '',
        features: []
      });
    }
    setIsModalOpen(true);
  };

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFormData(prev => ({ ...prev, features: [...prev.features, featureInput.trim()] }));
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      features: prev.features.filter((_, i) => i !== index) 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updatePlan(editingId, formData);
    } else {
      await addPlan(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this service plan?')) {
      removePlan(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary">Service Plans</h2>
          <p className="text-textSecondary">Manage active service subscriptions and pricing tiers.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-darkGreen text-white font-bold rounded-xl shadow-lg shadow-darkGreen/10 hover:bg-opacity-90 transition-all"
        >
          <Plus size={20} /> Create Service
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
            <div className="p-4 flex-1">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2.5 bg-softMint rounded-xl text-darkGreen">
                   <Package size={20} />
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => handleOpenModal(plan)}
                        className="p-2 text-textMuted hover:text-primary transition-colors"
                        title="Edit"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={() => handleDelete(plan.id)}
                        className="p-2 text-textMuted hover:text-danger transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-textPrimary mb-1.5">{plan.name}</h3>
              <p className="text-sm text-textSecondary mb-4 min-h-[28px]">{plan.description}</p>

              <div className="flex items-end gap-1 mb-4">
                <span className="text-2xl font-bold text-textPrimary">${plan.price.toLocaleString()}</span>
                <span className="text-sm text-textMuted font-medium mb-1">
                    {plan.billingCycle === 'one-time' ? '/ one-time' : '/ month'}
                </span>
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                {plan.features.length > 0 ? (
                    plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-textSecondary">
                            <CheckCircle2 size={14} className="text-success shrink-0" />
                            <span>{feature}</span>
                        </div>
                    ))
                ) : (
                    <span className="text-xs text-textMuted italic">No specific features listed.</span>
                )}
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-border">
                <button 
                    onClick={() => handleOpenModal(plan)}
                    className="w-full py-2 border border-border bg-white text-textPrimary font-bold rounded-lg hover:bg-slate-100 transition-colors text-sm"
                >
                    Edit Plan Details
                </button>
            </div>
          </div>
        ))}

        {plans.length === 0 && (
            <div className="col-span-full py-20 text-center text-textMuted border-2 border-dashed border-border rounded-2xl bg-slate-50">
                <Package size={48} className="mx-auto mb-4 opacity-20" />
                <p>No service plans created yet.</p>
                <button onClick={() => handleOpenModal()} className="mt-4 text-primary font-bold hover:underline">Create your first plan</button>
            </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-textPrimary">
                {editingId ? 'Edit Service Plan' : 'Create New Service Plan'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-textMuted hover:text-danger">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Service Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  placeholder="e.g. SEO Pro Package"
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Fee ($)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                    <input 
                        type="number" 
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                        className="w-full pl-8 pr-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        required 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Duration (Days)</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                     <input 
                        type="number" 
                        value={formData.duration}
                        onChange={(e) => setFormData({...formData, duration: parseFloat(e.target.value)})}
                        className="w-full pl-8 pr-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        placeholder="30"
                        required 
                    />
                  </div>
                </div>
              </div>

              {/* Billing Cycle Selection */}
              <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase mb-2">Billing Cycle</label>
                  <div className="flex gap-2">
                      <button
                          type="button"
                          onClick={() => setFormData({...formData, billingCycle: 'monthly'})}
                          className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                              formData.billingCycle === 'monthly' 
                              ? 'bg-softMint border-primary text-darkGreen' 
                              : 'bg-white border-border text-textSecondary hover:bg-slate-50'
                          }`}
                      >
                          <Repeat size={16} /> Monthly / Recurring
                      </button>
                      <button
                          type="button"
                          onClick={() => setFormData({...formData, billingCycle: 'one-time'})}
                          className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                              formData.billingCycle === 'one-time' 
                              ? 'bg-blue-50 border-blue-200 text-blue-700' 
                              : 'bg-white border-border text-textSecondary hover:bg-slate-50'
                          }`}
                      >
                          <Clock size={16} /> One-time Fee
                      </button>
                  </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
                  placeholder="Describe what's included in this service..."
                  required
                />
              </div>

              <div>
                 <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Features List</label>
                 <div className="flex gap-2 mb-2">
                    <input 
                        type="text" 
                        value={featureInput}
                        onChange={(e) => setFeatureInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                        placeholder="Add a feature (e.g. Weekly Reporting)"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                    />
                    <button 
                        type="button" 
                        onClick={handleAddFeature}
                        className="px-4 py-2 bg-slate-100 border border-border rounded-lg text-sm font-bold hover:bg-slate-200"
                    >
                        Add
                    </button>
                 </div>
                 <div className="space-y-2">
                    {formData.features.map((feature, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-border text-sm">
                            <span>{feature}</span>
                            <button type="button" onClick={() => removeFeature(idx)} className="text-textMuted hover:text-danger"><X size={14} /></button>
                        </div>
                    ))}
                 </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 mt-4 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 transition-all"
              >
                {editingId ? 'Save Changes' : 'Create Plan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicePlans;
