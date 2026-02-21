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
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [statusUpdating, setStatusUpdating] = useState(false);

    useEffect(() => {
        api.get(`/events/${id}`).then(res => {
            const d = res.data;
            setForm({
                name: d.name, description: d.description, type: d.type,
                startDate: d.startDate ? d.startDate.slice(0, 16) : '',
                endDate: d.endDate ? d.endDate.slice(0, 16) : '',
                registrationDeadline: d.registrationDeadline ? d.registrationDeadline.slice(0, 16) : '',
                venue: d.venue || '', registrationFee: d.registrationFee || 0, registrationLimit: d.registrationLimit || 0,
                eligibility: d.eligibility || 'all', tags: d.tags ? d.tags.join(', ') : '', status: d.status,
                purchaseLimitPerUser: d.purchaseLimitPerUser || 1,
                formLocked: d.formLocked || false,
            });
            setCustomForm(d.customForm || []);
            setMerchItems(d.merchandiseItems || []);
            setLoading(false);
        }).catch(() => navigate('/organizer/events'));
    }, [id, navigate]);

    const isDraft = form?.status === 'draft';
    const isPublished = form?.status === 'published';
    const isEditable = isDraft || isPublished;

    // Form Builder functions
    function addFormField() {
        if (form.formLocked) return;
        setCustomForm([...customForm, { label: '', fieldType: 'text', required: false, options: [] }]);
    }

    function removeFormField(index) {
        if (form.formLocked) return;
        setCustomForm(customForm.filter((_, i) => i !== index));
    }

    function updateField(i, key, val) {
        if (form.formLocked) return;
        const u = [...customForm];
        u[i][key] = val;
        setCustomForm(u);
    }

    function moveField(index, direction) {
        if (form.formLocked) return;
        const newForm = [...customForm];
        const swapIndex = index + direction;
        if (swapIndex < 0 || swapIndex >= newForm.length) return;
        [newForm[index], newForm[swapIndex]] = [newForm[swapIndex], newForm[index]];
        setCustomForm(newForm);
    }

    function updateFieldOptions(i, optionsStr) {
        if (form.formLocked) return;
        const u = [...customForm];
        u[i].options = optionsStr.split(',').map(o => o.trim()).filter(Boolean);
        setCustomForm(u);
    }

    // Status change handler
    async function handleStatusChange(newStatus) {
        if (!window.confirm(`Change status to "${newStatus}"?`)) return;
        setStatusUpdating(true);
        setError('');
        try {
            await api.patch(`/events/${id}/status`, { status: newStatus });
            setSuccess(`Status changed to "${newStatus}" successfully!`);
            // Refresh event data
            const res = await api.get(`/events/${id}`);
            setForm(prev => ({ ...prev, status: res.data.status }));
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update status');
        } finally {
            setStatusUpdating(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setSuccess('');
        try {
            const payload = {};

            if (isDraft) {
                // Draft: full freedom
                Object.assign(payload, {
                    ...form,
                    registrationLimit: parseInt(form.registrationLimit) || 0,
                    registrationFee: parseInt(form.registrationFee) || 0,
                    tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
                    customForm: form.type === 'normal' ? customForm : [],
                });
                delete payload.status;
                delete payload.formLocked;
            } else if (isPublished) {
                // Published: restricted edits
                payload.description = form.description;
                if (form.registrationDeadline) payload.registrationDeadline = form.registrationDeadline;
                if (form.registrationLimit) payload.registrationLimit = parseInt(form.registrationLimit) || 0;
            }

            await api.put(`/events/${id}`, payload);
            setSuccess('Event updated successfully!');
            setTimeout(() => navigate('/organizer/dashboard'), 1000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update.');
        }
        setSubmitting(false);
    }

    if (loading) return <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>Loading...</div>;
    if (!form) return null;

    const canEdit = isDraft || isPublished;

    return (
        <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff' }}>
            <div style={{ padding: '10px 15px', marginBottom: '20px', background: '#f5f5f5', color: '#333', border: '1px solid #eee', borderRadius: '4px', fontSize: '13px' }}>
                <strong>Editing Rules & Actions:</strong><br />
                Draft (free edits, can be published); Published (description update, extend deadline, increase limit, close registrations); Ongoing/Completed (no edits except status change, can be marked completed or closed).
                <br /><br />
                <strong>Form Builder:</strong> Organizers can create custom registration forms for events. Supports various field types (text, dropdown, checkbox, file upload, etc.), mark fields as required/flexible, and reorder fields. Forms are locked after the first registration is received.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                <h1 style={{ margin: 0 }}>Edit Event</h1>
                <span style={{
                    padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                    textTransform: 'uppercase',
                    background: isDraft ? '#fcf8e3' : isPublished ? '#dff0d8' : '#d9edf7',
                    color: isDraft ? '#8a6d3b' : isPublished ? '#3c763d' : '#31708f',
                }}>
                    {form.status}
                </span>
            </div>

            {error && <div style={{ padding: '10px', marginBottom: '15px', background: '#f2dede', color: '#a94442', border: '1px solid #ebccd1', borderRadius: '4px' }}>{error}</div>}
            {success && <div style={{ padding: '10px', marginBottom: '15px', background: '#dff0d8', color: '#3c763d', border: '1px solid #d6e9c6', borderRadius: '4px' }}>{success}</div>}

            {/* Info banner for restricted editing */}
            {isPublished && (
                <div style={{ padding: '10px 15px', marginBottom: '20px', background: '#d9edf7', color: '#31708f', border: '1px solid #bce8f1', borderRadius: '4px', fontSize: '13px' }}>
                    This event is published. You can only edit the <strong>description</strong>, <strong>extend the registration deadline</strong>, and <strong>increase the registration limit</strong>.
                </div>
            )}

            {!canEdit && (
                <div style={{ padding: '15px', marginBottom: '20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 10px 0', color: '#666' }}>
                        This event is <strong>{form.status}</strong> and cannot be edited. You may only change its status.
                    </p>
                    {form.status === 'ongoing' && (
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => handleStatusChange('completed')} disabled={statusUpdating}
                                style={{ padding: '8px 20px', background: '#5cb85c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                {statusUpdating ? '...' : 'Mark Completed'}
                            </button>
                            <button onClick={() => handleStatusChange('closed')} disabled={statusUpdating}
                                style={{ padding: '8px 20px', background: '#d9534f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                {statusUpdating ? '...' : 'Close Event'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {canEdit && (
                <form onSubmit={handleSubmit}>
                    {/* Event Name */}
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Event Name</label>
                        {isDraft ? (
                            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px' }} required />
                        ) : (
                            <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', color: '#666' }}>{form.name}</div>
                        )}
                    </div>

                    {/* Description - always editable when canEdit */}
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
                        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '8px', height: '100px' }} />
                    </div>

                    {/* Dates */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Start Date & Time</label>
                            {isDraft ? (
                                <input type="datetime-local" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={{ width: '100%', padding: '8px' }} required />
                            ) : (
                                <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', color: '#666' }}>{form.startDate ? new Date(form.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'TBD'}</div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>End Date & Time</label>
                            {isDraft ? (
                                <input type="datetime-local" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={{ width: '100%', padding: '8px' }} required />
                            ) : (
                                <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', color: '#666' }}>{form.endDate ? new Date(form.endDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'TBD'}</div>
                            )}
                        </div>
                    </div>

                    {/* Eligibility */}
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Eligibility</label>
                        {isDraft ? (
                            <select style={{ width: '100%', padding: '8px' }} value={form.eligibility} onChange={e => setForm({ ...form, eligibility: e.target.value })}>
                                <option value="all">Open to Everyone</option>
                                <option value="iiit-only">IIIT Students Only</option>
                            </select>
                        ) : (
                            <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', color: '#666', textTransform: 'capitalize' }}>{form.eligibility === 'iiit-only' ? 'IIIT Students Only' : 'Open to All'}</div>
                        )}
                    </div>

                    {/* Tags */}
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Tags (comma separated)</label>
                        {isDraft ? (
                            <input type="text" placeholder="e.g. music, cultural, dance" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                        ) : (
                            <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', color: '#666' }}>{form.tags || 'None'}</div>
                        )}
                    </div>

                    {/* Logistics (Normal events) */}
                    {form.type === 'normal' && (
                        <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '15px' }}>
                            <h3>Logistics</h3>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Venue</label>
                                {isDraft ? (
                                    <input type="text" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                                ) : (
                                    <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', color: '#666' }}>{form.venue || '-'}</div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>Registration Fee (Rs)</label>
                                    {isDraft ? (
                                        <input type="number" min="0" value={form.registrationFee} onChange={e => setForm({ ...form, registrationFee: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                                    ) : (
                                        <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', color: '#666' }}>Rs. {form.registrationFee}</div>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>Participant Limit (0 for unlimited)</label>
                                    <input type="number" min={isDraft ? 0 : form.registrationLimit} value={form.registrationLimit}
                                        onChange={e => setForm({ ...form, registrationLimit: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                                    {isPublished && <small style={{ color: '#888' }}>Can only increase from current value</small>}
                                </div>
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Registration Deadline</label>
                                <input type="datetime-local" value={form.registrationDeadline} onChange={e => setForm({ ...form, registrationDeadline: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                                {isPublished && <small style={{ color: '#888' }}>Can only extend, not shorten</small>}
                            </div>
                        </div>
                    )}

                    {/* Form Builder (Draft only, normal events) */}
                    {form.type === 'normal' && isDraft && (
                        <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h3 style={{ margin: 0 }}>Custom Registration Form</h3>
                                {form.formLocked && (
                                    <span style={{ padding: '3px 10px', background: '#f2dede', color: '#a94442', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                                        LOCKED (registrations received)
                                    </span>
                                )}
                            </div>
                            {form.formLocked && (
                                <p style={{ color: '#a94442', fontSize: '13px', marginBottom: '10px' }}>
                                    The form is locked because registrations have already been received. You cannot modify the form fields.
                                </p>
                            )}

                            {customForm.map((field, i) => (
                                <div key={i} style={{
                                    border: '1px solid #ddd', borderRadius: '4px', padding: '12px', marginBottom: '10px',
                                    background: form.formLocked ? '#fafafa' : '#fff',
                                    opacity: form.formLocked ? 0.7 : 1,
                                }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '8px' }}>
                                        <div style={{ flex: 2 }}>
                                            <label style={{ fontSize: '11px', color: '#888' }}>Field Label</label>
                                            <input type="text" value={field.label} disabled={form.formLocked}
                                                onChange={e => updateField(i, 'label', e.target.value)}
                                                placeholder="e.g. T-shirt size"
                                                style={{ width: '100%', padding: '6px', fontSize: '13px' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '11px', color: '#888' }}>Type</label>
                                            <select value={field.fieldType} disabled={form.formLocked}
                                                onChange={e => updateField(i, 'fieldType', e.target.value)}
                                                style={{ width: '100%', padding: '6px', fontSize: '13px' }}>
                                                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                            <input type="checkbox" checked={field.required} disabled={form.formLocked}
                                                onChange={e => updateField(i, 'required', e.target.checked)} />
                                            Required
                                        </label>
                                    </div>

                                    {/* Options for dropdown/checkbox */}
                                    {(field.fieldType === 'dropdown' || field.fieldType === 'checkbox') && (
                                        <div style={{ marginBottom: '8px' }}>
                                            <label style={{ fontSize: '11px', color: '#888' }}>Options (comma separated)</label>
                                            <input type="text" value={(field.options || []).join(', ')} disabled={form.formLocked}
                                                onChange={e => updateFieldOptions(i, e.target.value)}
                                                placeholder="Option 1, Option 2, Option 3"
                                                style={{ width: '100%', padding: '6px', fontSize: '13px' }} />
                                        </div>
                                    )}

                                    {/* Reorder / Remove buttons */}
                                    {!form.formLocked && (
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                            <button type="button" onClick={() => moveField(i, -1)} disabled={i === 0}
                                                style={{ padding: '3px 8px', fontSize: '12px', cursor: 'pointer', background: '#eee', border: '1px solid #ccc', borderRadius: '3px' }}>↑</button>
                                            <button type="button" onClick={() => moveField(i, 1)} disabled={i === customForm.length - 1}
                                                style={{ padding: '3px 8px', fontSize: '12px', cursor: 'pointer', background: '#eee', border: '1px solid #ccc', borderRadius: '3px' }}>↓</button>
                                            <button type="button" onClick={() => removeFormField(i)}
                                                style={{ padding: '3px 8px', fontSize: '12px', cursor: 'pointer', background: '#f2dede', color: '#a94442', border: '1px solid #ebccd1', borderRadius: '3px' }}>Remove</button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {!form.formLocked && (
                                <button type="button" onClick={addFormField}
                                    style={{ marginTop: '5px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px' }}>
                                    + Add Field
                                </button>
                            )}
                        </div>
                    )}

                    {/* Submit & Status Actions */}
                    <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button type="submit" disabled={submitting}
                            style={{ padding: '10px 20px', fontSize: '16px', background: '#337ab7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>

                        {isDraft && (
                            <button type="button" disabled={statusUpdating}
                                onClick={() => handleStatusChange('published')}
                                style={{ padding: '10px 20px', fontSize: '16px', background: '#5cb85c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                {statusUpdating ? 'Publishing...' : 'Publish Event'}
                            </button>
                        )}

                        {isPublished && (
                            <button type="button" disabled={statusUpdating}
                                onClick={() => handleStatusChange('closed')}
                                style={{ padding: '10px 20px', fontSize: '16px', background: '#d9534f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                {statusUpdating ? '...' : 'Close Registrations'}
                            </button>
                        )}
                    </div>
                </form>
            )}
        </div>
    );
}
