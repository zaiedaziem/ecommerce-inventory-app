import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import { MALAYSIAN_STATES } from '../constants/malaysia';

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1';
const cardClass = 'bg-white rounded-xl border border-slate-200 shadow-sm p-6';
const buttonClass =
  'px-5 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors';

const emptyAddress = { line1: '', line2: '', city: '', postcode: '', state: '' };

function Feedback({ status }) {
  if (!status) return null;
  return (
    <p className={`text-sm ${status.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
      {status.message}
    </p>
  );
}

function ProfileDetailsForm({ user, isCustomer }) {
  const { updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [address, setAddress] = useState({ ...emptyAddress, ...user.address });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const setAddressField = (field) => (e) => setAddress((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const changes = { name };
      if (isCustomer) {
        const hasAddress = Object.values(address).some((v) => v.trim() !== '');
        changes.phone = phone;
        changes.address = hasAddress ? address : null;
      }
      await updateProfile(changes);
      setStatus({ type: 'success', message: 'Profile saved.' });
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`${cardClass} space-y-4`}>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Profile details</h2>
        <p className="text-sm text-slate-500">
          {isCustomer ? 'Your contact details and delivery address.' : 'Your account information.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="profile-name" className={labelClass}>Name</label>
          <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label htmlFor="profile-email" className={labelClass}>Email</label>
          <input id="profile-email" value={user.email} disabled className={inputClass} />
        </div>
      </div>

      {isCustomer && (
        <>
          <div className="sm:w-1/2 sm:pr-2">
            <label htmlFor="profile-phone" className={labelClass}>Phone number</label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="012-345 6789"
              autoComplete="tel"
              className={inputClass}
            />
          </div>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-slate-900 mb-2">Delivery address</legend>
            <div>
              <label htmlFor="address-line1" className={labelClass}>Address line 1</label>
              <input id="address-line1" value={address.line1} onChange={setAddressField('line1')} placeholder="No. 12, Jalan SS 2/24" autoComplete="address-line1" className={inputClass} />
            </div>
            <div>
              <label htmlFor="address-line2" className={labelClass}>
                Address line 2 <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input id="address-line2" value={address.line2} onChange={setAddressField('line2')} placeholder="Taman / building / unit" autoComplete="address-line2" className={inputClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="address-postcode" className={labelClass}>Postcode</label>
                <input id="address-postcode" value={address.postcode} onChange={setAddressField('postcode')} inputMode="numeric" maxLength={5} placeholder="47300" autoComplete="postal-code" className={inputClass} />
              </div>
              <div>
                <label htmlFor="address-city" className={labelClass}>City</label>
                <input id="address-city" value={address.city} onChange={setAddressField('city')} placeholder="Petaling Jaya" autoComplete="address-level2" className={inputClass} />
              </div>
              <div>
                <label htmlFor="address-state" className={labelClass}>State</label>
                <select id="address-state" value={address.state} onChange={setAddressField('state')} className={inputClass}>
                  <option value="">Select a state</option>
                  {MALAYSIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>
        </>
      )}

      <div className="flex items-center gap-4 pt-1">
        <button type="submit" disabled={saving} className={buttonClass}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <Feedback status={status} />
      </div>
    </form>
  );
}

function ChangePasswordForm() {
  const { changePassword } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (form.next !== form.confirm) {
      setStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    setSaving(true);
    try {
      await changePassword(form.current, form.next);
      setForm({ current: '', next: '', confirm: '' });
      setStatus({ type: 'success', message: 'Password changed. Other devices have been signed out.' });
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`${cardClass} space-y-4`}>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Change password</h2>
        <p className="text-sm text-slate-500">Changing your password signs you out on other devices.</p>
      </div>

      <div className="sm:w-1/2 sm:pr-2">
        <label htmlFor="current-password" className={labelClass}>Current password</label>
        <PasswordInput id="current-password" value={form.current} onChange={setField('current')} autoComplete="current-password" required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="new-password" className={labelClass}>New password</label>
          <PasswordInput id="new-password" value={form.next} onChange={setField('next')} autoComplete="new-password" minLength={8} required />
          <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="confirm-password" className={labelClass}>Confirm new password</label>
          <PasswordInput id="confirm-password" value={form.confirm} onChange={setField('confirm')} autoComplete="new-password" minLength={8} required />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-1">
        <button type="submit" disabled={saving} className={buttonClass}>
          {saving ? 'Updating…' : 'Update password'}
        </button>
        <Feedback status={status} />
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    refreshUser()
      .catch(() => {})
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loaded) {
    return <p className="text-slate-500 text-center py-16">Loading profile…</p>;
  }

  const isCustomer = user.role === 'customer';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium capitalize">
          {user.role}
        </span>
      </div>
      <ProfileDetailsForm user={user} isCustomer={isCustomer} />
      <ChangePasswordForm />
    </div>
  );
}
