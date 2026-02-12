
import React, { useState } from 'react';
import { Role } from '../types';
import { Button } from './Button';
import { ShieldCheck, CheckCircle2, Zap, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface SubscriptionModalProps {
  role: Role;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ role }) => {
  const [processing, setProcessing] = useState(false);

  // --- RAZORPAY LIVE CONFIGURATION ---
  // This is the LIVE key. Ensure your Razorpay Dashboard is in Live Mode too.
  const RAZORPAY_KEY_ID = "rzp_live_S68jYp5FzK6UCB"; 
  const APP_NAME = "VidyaSetu AI";

  const getPlans = () => {
    if (role === 'principal' || role === 'admin') {
      return [
        { label: 'Premium Annual Plan', amount: 120000, duration: 'year' },
      ];
    } else if (role === 'parent' || role === 'student' as any) {
      return [
        { label: 'Student Annual Plan', amount: 200, duration: 'year' },
      ];
    }
    return [];
  };

  const updateSubscriptionInDB = async (duration: string, paymentId: string) => {
      try {
          console.log("Processing Live Payment:", paymentId);

          // 1. Calculate New Date
          const now = new Date();
          const currentExpiryStr = localStorage.getItem('vidyasetu_subscription_end'); 
          
          let baseDate = new Date();
          // If current expiry is in future, add time to THAT date, else add to NOW
          if (currentExpiryStr) {
              const currentExpiry = new Date(currentExpiryStr);
              if (currentExpiry > now) baseDate = currentExpiry;
          }

          if (duration === 'month') {
              baseDate.setDate(baseDate.getDate() + 30);
          } else {
              baseDate.setFullYear(baseDate.getFullYear() + 1);
          }

          const newDateString = baseDate.toISOString().split('T')[0];

          // 2. Identify User/School
          const credsStr = localStorage.getItem('vidyasetu_creds');
          if (!credsStr) throw new Error("User session not found");
          const creds = JSON.parse(credsStr);

          // 3. Update Supabase
          if (role === 'principal' || role === 'admin') {
              // Update School Table
              const { data: schoolData } = await supabase.from('schools').select('id').eq('school_code', creds.school_id).single();
              if (schoolData) {
                  const { error } = await supabase.from('schools').update({ subscription_end_date: newDateString }).eq('id', schoolData.id);
                  if (error) throw error;
              }
          } else {
              // Update User Table
              const { error } = await supabase.from('users').update({ subscription_end_date: newDateString }).eq('mobile', creds.mobile);
              if (error) throw error;
          }

          alert(`Payment Successful! Your plan is active until ${newDateString}. The app will now refresh.`);
          window.location.reload();

      } catch (e: any) {
          console.error("DB Update Failed", e);
          alert("Payment received by Gateway but database update failed. Please contact support with Payment ID: " + paymentId);
      }
  };

  const handleRazorpay = async (amount: number, duration: string, label: string) => {
    setProcessing(true);

    const options = {
        key: RAZORPAY_KEY_ID, 
        amount: amount * 100, // Amount in paise
        currency: "INR",
        name: APP_NAME,
        description: `${label} Activation`,
        image: "https://cdn-icons-png.flaticon.com/512/3413/3413535.png",
        handler: async function (response: any) {
            // Payment Success Handler
            if(response.razorpay_payment_id) {
                await updateSubscriptionInDB(duration, response.razorpay_payment_id);
            }
            setProcessing(false);
        },
        prefill: {
            name: localStorage.getItem('vidyasetu_name') || "VidyaSetu User",
            contact: localStorage.getItem('vidyasetu_creds') ? JSON.parse(localStorage.getItem('vidyasetu_creds')!).mobile : "",
        },
        theme: {
            color: "#10b981" // Brand Green
        },
        modal: {
            ondismiss: function() {
                setProcessing(false);
            }
        }
    };

    try {
        const rzp1 = new (window as any).Razorpay(options);
        rzp1.on('payment.failed', function (response: any){
            alert("Payment Failed: " + (response.error.description || "Transaction declined"));
            setProcessing(false);
        });
        rzp1.open();
    } catch (e) {
        alert("Payment Gateway Error. Please check your internet connection.");
        setProcessing(false);
    }
  };

  const plans = getPlans();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex justify-center items-center w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 mb-2 shadow-inner">
           <ShieldCheck size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Select Premium Plan</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium px-4">
          100% Secure Payment via <span className="text-blue-600 font-bold">Razorpay</span>
        </p>
      </div>

      <div className="grid gap-3">
        {plans.map((plan, index) => (
          <button
            key={index}
            disabled={processing}
            onClick={() => handleRazorpay(plan.amount, plan.duration, plan.label)}
            className="flex justify-between items-center w-full p-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-white/5 rounded-3xl hover:border-brand-500 transition-all group active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{plan.duration.toUpperCase()}LY ACCESS</p>
              <p className="font-black text-slate-800 dark:text-white group-hover:text-brand-500 transition-colors uppercase tracking-tight">{plan.label}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-brand-500">₹{plan.amount.toLocaleString('en-IN')}</span>
              <div className={`p-2 rounded-lg text-white group-hover:bg-brand-600 transition-colors ${processing ? 'bg-slate-400' : 'bg-brand-500'}`}>
                {processing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-500/10 p-5 rounded-3xl border border-blue-100 dark:border-blue-500/20 space-y-3">
        <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-widest">
           <CheckCircle2 size={18} />
           Live Activation
        </div>
        <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold leading-relaxed italic">
          "Your payment is processed securely on the Live Server. Subscription activates immediately."
        </p>
      </div>

      <div className="text-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-50">
           Powered by Razorpay • Secure Gateway
        </p>
      </div>
    </div>
  );
};
