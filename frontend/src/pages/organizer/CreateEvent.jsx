import { useState } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

/**
 * CreateEvent Page
 * 
 * Allows organizers to create new events.
 * Supports two distinct types:
 * 1. Normal Events: Standard gatherings with a schedule, venue, and optional fee.
 * 2. Merchandise Events: "Drops" for selling items like T-shirts or Hoodies.
 * 
 * Note: All created events start as 'draft' so the organizer can preview them.
 */
const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'file', label: 'File Upload' },
];

export default function CreateEvent() {
    const navigate = useNavigate();
    const [status, setStatus] = useState(null); // Feedback for success/error
    const [submitting, setSubmitting] = useState(false);
    const [publishNow, setPublishNow] = useState(false); // Whether to publish directly

    // Form State
    const [form, setForm] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        venue: '',
        registrationLimit: 0,
        registrationFee: 0,
        registrationDeadline: '',
        type: 'normal', // 'normal' or 'merchandise'
        eligibility: 'all', // 'all' or 'iiit-only'
        tags: '', // Comma-separated list of tags for discovery
        purchaseLimitPerUser: 1, // Specific to merch
    });

    // Merch Items State (only used if type === 'merchandise')
    const [merchItems, setMerchItems] = useState([]);
    const [customForm, setCustomForm] = useState([]);

    function addFormField() {
        setCustomForm([...customForm, { label: '', fieldType: 'text', required: false, options: [] }]);
    }

    function removeFormField(index) {
        setCustomForm(customForm.filter((_, i) => i !== index));
    }

    function updateField(i, key, val) {
        const u = [...customForm];
        u[i][key] = val;
        setCustomForm(u);
    }

    function moveField(index, direction) {
        const newForm = [...customForm];
        const swapIndex = index + direction;
        if (swapIndex < 0 || swapIndex >= newForm.length) return;
        [newForm[index], newForm[swapIndex]] = [newForm[swapIndex], newForm[index]];
        setCustomForm(newForm);
    }

    function updateFieldOptions(i, optionsStr) {
        const u = [...customForm];
        u[i].options = optionsStr.split(',').map(o => o.trim()).filter(Boolean);
        setCustomForm(u);
    }

    /**
     * Adds a blank row to the merchandise items list.
     */
    function addMerchItem() {
        setMerchItems([...merchItems, { name: '', size: '', color: '', variant: '', stock: 0, price: 0 }]);
    }

    /**
     * Updates a specific field of a merchandise item.
     */
    function updateMerchItem(index, field, value) {
        const newItems = [...merchItems];
        newItems[index][field] = value;
        setMerchItems(newItems);
    }

    /**
     * Handles the main form submission.
     */
    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        setStatus(null);

        // Basic validation for dates
        if (new Date(form.startDate) >= new Date(form.endDate)) {
            setStatus({ type: 'error', text: 'End date must be after the start date.' });
            setSubmitting(false);
            return;
        }

        try {
            const payload = { ...form };
            payload.tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);

            if (form.startDate) payload.startDate = new Date(form.startDate).toISOString();
            if (form.endDate) payload.endDate = new Date(form.endDate).toISOString();
            if (form.registrationDeadline) payload.registrationDeadline = new Date(form.registrationDeadline).toISOString();

            if (form.type === 'merchandise') {
                if (merchItems.length === 0) {
                    setStatus({ type: 'error', text: 'Please add at least one merchandise item.' });
                    setSubmitting(false);
                    return;
                }
                payload.items = merchItems;
                payload.purchaseLimitPerUser = parseInt(form.purchaseLimitPerUser) || 1;

                delete payload.venue;
                delete payload.registrationFee;
            } else {
                delete payload.purchaseLimitPerUser;
                payload.customForm = customForm;
            }

            // Send to backend
            payload.publishNow = publishNow;
            await api.post('/events', payload);

            const actionText = publishNow ? 'Event published' : 'Event draft created';
            setStatus({ type: 'success', text: `${actionText} successfully! Redirecting you...` });

            // Redirect to dashboard after a short delay so they can see the success message
            setTimeout(() => navigate('/organizer'), 1500);

        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', text: err.response?.data?.error || 'Failed to create event. Please try again.' });
        }
        setSubmitting(false);
    }

    return (
        <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff' }}>
            <h1 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Create New Event</h1>

            {status && (
                <div style={{
                    padding: '10px', marginBottom: '20px',
                    background: status.type === 'success' ? '#dff0d8' : '#f2dede',
                    color: status.type === 'success' ? '#3c763d' : '#a94442',
                    border: '1px solid', borderColor: status.type === 'success' ? '#d6e9c6' : '#ebccd1',
                    borderRadius: '4px'
                }}>
                    {status.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Event Type Selection */}
                <div style={{ marginBottom: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '4px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Event Type</label>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <label>
                            <input
                                type="radio"
                                name="type"
                                value="normal"
                                checked={form.type === 'normal'}
                                onChange={e => setForm({ ...form, type: e.target.value })}
                            /> Standard Event
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="type"
                                value="merchandise"
                                checked={form.type === 'merchandise'}
                                onChange={e => setForm({ ...form, type: e.target.value })}
                            /> Merchandise Drop
                        </label>
                    </div>
                </div>

                {/* Common Fields */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Event Name</label>
                    <input type="text" style={{ width: '100%', padding: '8px' }} required
                        value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
                    <textarea style={{ width: '100%', padding: '8px', height: '100px' }}
                        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Start Date & Time</label>
                        <input type="datetime-local" style={{ width: '100%', padding: '8px' }} required
                            value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>End Date & Time</label>
                        <input type="datetime-local" style={{ width: '100%', padding: '8px' }} required
                            value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
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
                    <input type="text" placeholder="e.g. music, cultural, dance" style={{ width: '100%', padding: '8px' }}
                        value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
                    <small style={{ color: '#777' }}>Helps participants find your event based on their interests</small>
                </div>

                {/* Normal Event Specific Fields */}
                {form.type === 'normal' && (
                    <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '15px' }}>
                        <h3>Logistics</h3>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Venue</label>
                            <input type="text" style={{ width: '100%', padding: '8px' }} required
                                value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Registration Fee (Rs)</label>
                                <input type="number" min="0" style={{ width: '100%', padding: '8px' }}
                                    value={form.registrationFee} onChange={e => setForm({ ...form, registrationFee: e.target.value })} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Participant Limit (0 for unlimited)</label>
                                <input type="number" min="0" style={{ width: '100%', padding: '8px' }}
                                    value={form.registrationLimit} onChange={e => setForm({ ...form, registrationLimit: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Registration Deadline (Optional)</label>
                            <input type="datetime-local" style={{ width: '100%', padding: '8px' }}
                                value={form.registrationDeadline} onChange={e => setForm({ ...form, registrationDeadline: e.target.value })} />
                        </div>
                    </div>
                )}

                {/* Form Builder for Normal Events */}
                {form.type === 'normal' && (
                    <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '15px' }}>
                        <h3 style={{ margin: '0 0 5px 0' }}>Custom Registration Form</h3>
                        <p style={{ fontSize: '13px', color: '#888', marginBottom: '15px' }}>
                            Add custom fields that participants must fill when registering. The form locks after the first registration.
                        </p>

                        {customForm.map((field, i) => (
                            <div key={i} style={{
                                border: '1px solid #ddd', borderRadius: '4px', padding: '12px', marginBottom: '10px', background: '#fff',
                            }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '8px' }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ fontSize: '11px', color: '#888' }}>Field Label</label>
                                        <input type="text" value={field.label}
                                            onChange={e => updateField(i, 'label', e.target.value)}
                                            placeholder="e.g. T-shirt size"
                                            style={{ width: '100%', padding: '6px', fontSize: '13px' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '11px', color: '#888' }}>Type</label>
                                        <select value={field.fieldType}
                                            onChange={e => updateField(i, 'fieldType', e.target.value)}
                                            style={{ width: '100%', padding: '6px', fontSize: '13px' }}>
                                            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                        <input type="checkbox" checked={field.required}
                                            onChange={e => updateField(i, 'required', e.target.checked)} />
                                        Required
                                    </label>
                                </div>

                                {(field.fieldType === 'dropdown' || field.fieldType === 'checkbox') && (
                                    <div style={{ marginBottom: '8px' }}>
                                        <label style={{ fontSize: '11px', color: '#888' }}>Options (comma separated)</label>
                                        <input type="text" value={(field.options || []).join(', ')}
                                            onChange={e => updateFieldOptions(i, e.target.value)}
                                            placeholder="Option 1, Option 2, Option 3"
                                            style={{ width: '100%', padding: '6px', fontSize: '13px' }} />
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={() => moveField(i, -1)} disabled={i === 0}
                                        style={{ padding: '3px 8px', fontSize: '12px', cursor: 'pointer', background: '#eee', border: '1px solid #ccc', borderRadius: '3px' }}>↑</button>
                                    <button type="button" onClick={() => moveField(i, 1)} disabled={i === customForm.length - 1}
                                        style={{ padding: '3px 8px', fontSize: '12px', cursor: 'pointer', background: '#eee', border: '1px solid #ccc', borderRadius: '3px' }}>↓</button>
                                    <button type="button" onClick={() => removeFormField(i)}
                                        style={{ padding: '3px 8px', fontSize: '12px', cursor: 'pointer', background: '#f2dede', color: '#a94442', border: '1px solid #ebccd1', borderRadius: '3px' }}>Remove</button>
                                </div>
                            </div>
                        ))}

                        <button type="button" onClick={addFormField}
                            style={{ marginTop: '5px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px' }}>
                            + Add Field
                        </button>
                    </div>
                )}

                {/* Merchandise Specific Fields */}
                {form.type === 'merchandise' && (
                    <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '15px' }}>
                        <h3>Merchandise Inventory</h3>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Purchase Limit (Max items per user)</label>
                            <input type="number" min="1" style={{ width: '100%', padding: '8px' }}
                                value={form.purchaseLimitPerUser} onChange={e => setForm({ ...form, purchaseLimitPerUser: e.target.value })} />
                        </div>

                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Items</label>
                        {merchItems.map((item, index) => (
                            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-end', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                                <div style={{ flex: 2 }}>
                                    <label style={{ fontSize: '12px' }}>Name</label>
                                    <input type="text" placeholder="e.g. Hoodie" style={{ width: '100%', padding: '5px' }} required
                                        value={item.name} onChange={e => updateMerchItem(index, 'name', e.target.value)} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px' }}>Variant</label>
                                    <input type="text" placeholder="Classic" style={{ width: '100%', padding: '5px' }}
                                        value={item.variant} onChange={e => updateMerchItem(index, 'variant', e.target.value)} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px' }}>Size</label>
                                    <input type="text" placeholder="L" style={{ width: '100%', padding: '5px' }}
                                        value={item.size} onChange={e => updateMerchItem(index, 'size', e.target.value)} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px' }}>Color</label>
                                    <input type="text" placeholder="Blue" style={{ width: '100%', padding: '5px' }}
                                        value={item.color} onChange={e => updateMerchItem(index, 'color', e.target.value)} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px' }}>Price (Rs)</label>
                                    <input type="number" min="0" placeholder="0" style={{ width: '100%', padding: '5px' }} required
                                        value={item.price} onChange={e => updateMerchItem(index, 'price', e.target.value)} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px' }}>Stock</label>
                                    <input type="number" min="0" placeholder="10" style={{ width: '100%', padding: '5px' }} required
                                        value={item.stock} onChange={e => updateMerchItem(index, 'stock', e.target.value)} />
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addMerchItem} style={{ marginTop: '10px', padding: '5px 10px', fontSize: '13px' }}>
                            + Add Item
                        </button>
                    </div>
                )}

                <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px', display: 'flex', gap: '15px' }}>
                    <button type="submit" disabled={submitting}
                        onClick={() => setPublishNow(false)}
                        style={{ padding: '10px 20px', fontSize: '16px', background: '#337ab7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        {submitting && !publishNow ? 'Saving...' : 'Save as Draft'}
                    </button>
                    <button type="submit" disabled={submitting}
                        onClick={() => setPublishNow(true)}
                        style={{ padding: '10px 20px', fontSize: '16px', background: '#5cb85c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        {submitting && publishNow ? 'Publishing...' : 'Publish Now'}
                    </button>
                </div>
            </form>
        </div>
    );
}
