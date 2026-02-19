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
                customForm: (form.type === 'normal' || form.type === 'hackathon') ? customForm : [],
                // Merch update logic might be complex if IDs needed, but for now simple overwrite
            };
            await api.put(`/events/${id}`, payload);
            navigate('/organizer/events');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update.');
        }
        setSubmitting(false);
    }

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <h1>Edit Event</h1>
            <form onSubmit={handleSubmit}>
                {/* Simplified form for edit - similar to Create but populated */}
                <div style={{ marginBottom: '10px' }}>
                    <label>Name</label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%' }} />
                </div>
                {/* ... other fields ... */}
                <button type="submit" disabled={submitting}>Update Event</button>
            </form>
        </div>
    );
}
