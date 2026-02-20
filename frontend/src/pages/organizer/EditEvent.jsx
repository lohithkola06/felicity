import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';

const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'file', label: 'File Upload' },
];

export default function EditEvent() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [customForm, setCustomForm] = useState([]);
    const [merchItems, setMerchItems] = useState([]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/events/${id}`).then(res => {
            const d = res.data;
            setForm({
                name: d.name, description: d.description, type: d.type,
                startDate: d.startDate ? d.startDate.slice(0, 16) : '',
                endDate: d.endDate ? d.endDate.slice(0, 16) : '',
                registrationDeadline: d.registrationDeadline ? d.registrationDeadline.slice(0, 16) : '',
                venue: d.venue, registrationFee: d.registrationFee, registrationLimit: d.registrationLimit,
                eligibility: d.eligibility, tags: d.tags ? d.tags.join(', ') : '', status: d.status,
                purchaseLimitPerUser: d.purchaseLimitPerUser
            });
            setCustomForm(d.customForm || []);
            setMerchItems(d.merchandiseItems || []); // or however it's stored
            setLoading(false);
        }).catch(() => navigate('/organizer/events'));
    }, [id, navigate]);

    function addFormField() {
        setCustomForm([...customForm, { label: '', fieldType: 'text', required: false, options: [] }]);
    }

    function updateField(i, key, val) {
        const u = [...customForm];
        u[i][key] = val;
        setCustomForm(u);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...form,
                registrationLimit: parseInt(form.registrationLimit) || 0,
                registrationFee: parseInt(form.registrationFee) || 0,
                tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
                customForm: form.type === 'normal' ? customForm : [],
            };
            await api.put(`/events/${id}`, payload);
            navigate('/organizer/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update.');
        }
        setSubmitting(false);
    }

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff' }}>
            <h1 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Edit Event</h1>
            {error && <div style={{ padding: '10px', marginBottom: '15px', background: '#f2dede', color: '#a94442', border: '1px solid #ebccd1', borderRadius: '4px' }}>{error}</div>}
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Event Name</label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px' }} required />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '8px', height: '100px' }} />
                </div>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Start Date & Time</label>
                        <input type="datetime-local" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={{ width: '100%', padding: '8px' }} required />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>End Date & Time</label>
                        <input type="datetime-local" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={{ width: '100%', padding: '8px' }} required />
                    </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Eligibility</label>
                    <select style={{ width: '100%', padding: '8px' }} value={form.eligibility} onChange={e => setForm({ ...form, eligibility: e.target.value })}>
                        <option value="all">Open to Everyone</option>
                        <option value="iiit-only">IIIT Students Only</option>
                    </select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Tags (comma separated)</label>
                    <input type="text" placeholder="e.g. music, cultural, dance" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                </div>

                {form.type === 'normal' && (
                    <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '15px' }}>
                        <h3>Logistics</h3>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Venue</label>
                            <input type="text" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Registration Fee (Rs)</label>
                                <input type="number" min="0" value={form.registrationFee} onChange={e => setForm({ ...form, registrationFee: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Participant Limit (0 for unlimited)</label>
                                <input type="number" min="0" value={form.registrationLimit} onChange={e => setForm({ ...form, registrationLimit: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                            </div>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Registration Deadline (Optional)</label>
                            <input type="datetime-local" value={form.registrationDeadline} onChange={e => setForm({ ...form, registrationDeadline: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <button type="submit" disabled={submitting} style={{ padding: '10px 20px', fontSize: '16px', background: '#337ab7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        {submitting ? 'Saving...' : 'Update Event'}
                    </button>
                </div>
            </form>
        </div>
    );
}
