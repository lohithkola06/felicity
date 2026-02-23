import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useDialog } from '../../context/DialogContext';
import { openFile } from '../../utils/fileResolver';

export default function OrgEventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [loading, setLoading] = useState(true);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [expandedRows, setExpandedRows] = useState({});
    const [activeTab, setActiveTab] = useState('individuals'); // 'individuals' or 'teams'
    const [rejectRegId, setRejectRegId] = useState(null);
    const [rejectComment, setRejectComment] = useState('');

    const { showConfirm, showAlert } = useDialog();

    useEffect(() => {
        fetchAll();
    }, [id]);

    const fetchAll = async () => {
        try {
            const [eventRes, analyticsRes, participantsRes] = await Promise.all([
                api.get(`/events/${id}`),
                api.get(`/organizer/events/${id}/analytics`),
                api.get(`/events/${id}/participants`),
            ]);
            setEvent(eventRes.data);
            setAnalytics(analyticsRes.data);
            setParticipants(participantsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        const confirmed = await showConfirm(`Change event status to "${newStatus}"?`);
        if (!confirmed) return;
        setStatusUpdating(true);
        try {
            await api.patch(`/events/${id}/status`, { status: newStatus });
            fetchAll();
        } catch (err) {
            showAlert(err.response?.data?.error || 'Failed to update status');
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleExportCSV = async () => {
        try {
            const res = await api.get(`/organizer/events/${id}/export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${event?.name || 'event'}-participants.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            showAlert('Export failed');
        }
    };

    const handleApproveOrder = async (regId) => {
        const confirmed = await showConfirm('Approve this order and generate a ticket?');
        if (!confirmed) return;
        setStatusUpdating(true);
        try {
            await api.patch(`/organizer/events/${id}/registrations/${regId}/approve`);
            showAlert('Order approved!');
            fetchAll();
        } catch (err) {
            showAlert(err.response?.data?.error || 'Failed to approve order');
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleRejectOrder = async () => {
        if (!rejectComment.trim()) return showAlert('A rejection reason is required.');
        setStatusUpdating(true);
        try {
            await api.patch(`/organizer/events/${id}/registrations/${rejectRegId}/reject`, { comment: rejectComment });
            showAlert('Order rejected space returned to inventory.');
            setRejectRegId(null);
            setRejectComment('');
            fetchAll();
        } catch (err) {
            showAlert(err.response?.data?.error || 'Failed to reject order');
        } finally {
            setStatusUpdating(false);
        }
    };

    if (loading) return <div style={{ maxWidth: '960px', margin: '40px auto', textAlign: 'center' }}>Loading...</div>;
    if (!event) return <div style={{ maxWidth: '960px', margin: '40px auto', textAlign: 'center' }}>Event not found.</div>;

    const statusColor = (status) => {
        const map = {
            draft: { bg: '#fcf8e3', color: '#8a6d3b' },
            published: { bg: '#dff0d8', color: '#3c763d' },
            ongoing: { bg: '#d9edf7', color: '#31708f' },
            completed: { bg: '#f5f5f5', color: '#333' },
            closed: { bg: '#f2dede', color: '#a94442' },
        };
        return map[status] || { bg: '#f5f5f5', color: '#333' };
    };

    const sc = statusColor(event.status);

    // Status transition buttons
    const statusActions = {
        draft: [{ label: 'Publish', status: 'published', color: '#5cb85c' }],
        published: [
            { label: 'Close Registrations', status: 'closed', color: '#d9534f' },
        ],
        ongoing: [
            { label: 'Mark Completed', status: 'completed', color: '#5cb85c' },
            { label: 'Close', status: 'closed', color: '#d9534f' },
        ],
    };

    const filteredParticipants = participants.filter(r => {
        const p = r.participant;
        const name = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim().toLowerCase() : '';
        const email = p?.email?.toLowerCase() || '';
        const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
        const matchFilter = filterStatus === 'all' || r.paymentStatus === filterStatus;
        return matchSearch && matchFilter;
    });

    // Let 'individualParticipants' refer to ALL filtered participants now
    const individualParticipants = filteredParticipants;

    // Group by team for the Teams tab
    const teamGroups = {};
    filteredParticipants.filter(r => r.team).forEach(r => {
        // r.team might be populated object or just ID depending on backend, let's handle both
        // Assuming r.team is populated with at least an _id and name in the fetch route, 
        // wait, looking at `eventRoutes.js` (used to get participants), it might not populate `team.name`.
        // Let's group by team ID.
        const teamId = r.team._id || r.team;
        if (!teamGroups[teamId]) {
            teamGroups[teamId] = { id: teamId, name: r.team.name || teamId, members: [] };
        }
        teamGroups[teamId].members.push(r);
    });
    const teamsList = Object.values(teamGroups);

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            {/* Back navigation */}
            <Link to="/organizer/dashboard" style={{ color: '#337ab7', textDecoration: 'none', fontSize: '14px' }}>← Back to Dashboard</Link>

            {/* Overview Section */}
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '24px', marginTop: '10px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h1 style={{ margin: '0 0 8px 0' }}>{event.name}</h1>
                        <span style={{
                            padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                            background: sc.bg, color: sc.color, textTransform: 'uppercase',
                        }}>
                            {event.status}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['draft', 'published'].includes(event.status) && (
                            <Link to={`/organizer/events/${id}/edit`}
                                style={{ padding: '8px 16px', background: '#f0ad4e', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '13px' }}>
                                Edit Event
                            </Link>
                        )}
                        <Link to={`/organizer/events/${id}/attendance`}
                            style={{ padding: '8px 16px', background: '#5bc0de', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '13px' }}>
                            View Attendance
                        </Link>
                        {(statusActions[event.status] || []).map(action => (
                            <button key={action.status}
                                onClick={() => handleStatusChange(action.status)}
                                disabled={statusUpdating}
                                style={{
                                    padding: '8px 16px', background: action.color, color: '#fff',
                                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
                                }}
                            >
                                {statusUpdating ? '...' : action.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
                    <div>
                        <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Type</strong>
                        <span style={{ textTransform: 'capitalize' }}>{event.type === 'merchandise' ? 'Merchandise Drop' : 'Standard Event'}</span>
                    </div>
                    <div>
                        <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Start Date</strong>
                        {event.startDate ? new Date(event.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'TBD'}
                    </div>
                    <div>
                        <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>End Date</strong>
                        {event.endDate ? new Date(event.endDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'TBD'}
                    </div>
                    <div>
                        <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Eligibility</strong>
                        <span style={{ textTransform: 'capitalize' }}>{event.eligibility === 'iiit-only' ? 'IIIT Students Only' : 'Open to All'}</span>
                    </div>
                    <div>
                        <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Registration Fee</strong>
                        {event.registrationFee > 0 ? `Rs. ${event.registrationFee}` : 'Free'}
                    </div>
                    <div>
                        <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Registration Limit</strong>
                        {event.registrationLimit > 0 ? event.registrationLimit : 'Unlimited'}
                    </div>
                    {event.venue && (
                        <div>
                            <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Venue</strong>
                            {event.venue}
                        </div>
                    )}
                    {event.registrationDeadline && (
                        <div>
                            <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Registration Deadline</strong>
                            {new Date(event.registrationDeadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </div>
                    )}
                </div>
            </div>

            {/* Analytics Section */}
            {analytics && (
                <div style={{ marginBottom: '20px' }}>
                    <h2>Analytics</h2>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                            <h3>{analytics.registrations}</h3>
                            <p>Registrations</p>
                        </div>
                        <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                            <h3>{analytics.attendance}</h3>
                            <p>Attendance</p>
                        </div>
                        <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                            <h3>Rs. {analytics.revenue}</h3>
                            <p>Revenue</p>
                        </div>
                        {analytics.teamCompletion !== undefined && (
                            <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                                <h3>{analytics.teamCompletion}</h3>
                                <p>Teams Completed</p>
                            </div>
                        )}
                        {analytics.itemSales && Object.keys(analytics.itemSales).length > 0 && (
                            <div style={{ flex: 1, minWidth: '200px', border: '1px solid #ccc', padding: '20px', background: '#fff', borderRadius: '4px' }}>
                                <strong>Item Sales</strong>
                                {Object.entries(analytics.itemSales).map(([item, count]) => (
                                    <div key={item} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '13px' }}>
                                        <span>{item}</span>
                                        <span style={{ fontWeight: 'bold' }}>{count} sold</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Participants Section */}
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0 }}>Participants ({filteredParticipants.length})</h2>
                    <button onClick={handleExportCSV}
                        style={{ padding: '8px 16px', background: '#5cb85c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                        Export CSV
                    </button>
                </div>

                {/* Search & Filter */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ flex: 2, minWidth: '200px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                        <option value="all">All Payments</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                    </select>
                </div>

                {/* Tabs */}
                {event.isTeamEvent && (
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
                        <button
                            onClick={() => setActiveTab('individuals')}
                            style={{
                                padding: '10px 20px', background: activeTab === 'individuals' ? '#fff' : '#f5f5f5',
                                color: activeTab === 'individuals' ? '#337ab7' : '#555',
                                border: '1px solid #ddd', borderBottom: activeTab === 'individuals' ? '2px solid #337ab7' : '1px solid #ddd',
                                borderTopLeftRadius: '4px', borderTopRightRadius: '4px', cursor: 'pointer', fontWeight: activeTab === 'individuals' ? 'bold' : 'normal',
                                marginBottom: '-1px'
                            }}
                        >
                            All Participants ({individualParticipants.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('teams')}
                            style={{
                                padding: '10px 20px', background: activeTab === 'teams' ? '#fff' : '#f5f5f5',
                                color: activeTab === 'teams' ? '#337ab7' : '#555',
                                border: '1px solid #ddd', borderBottom: activeTab === 'teams' ? '2px solid #337ab7' : '1px solid #ddd',
                                borderTopLeftRadius: '4px', borderTopRightRadius: '4px', cursor: 'pointer', fontWeight: activeTab === 'teams' ? 'bold' : 'normal',
                                marginBottom: '-1px'
                            }}
                        >
                            Teams ({teamsList.length})
                        </button>
                    </div>
                )}

                {/* Table for All Participants or when no team event */}
                {(activeTab === 'individuals' || !event.isTeamEvent) && (
                    individualParticipants.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No participants found.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                                        <th style={{ padding: '10px', border: '1px solid #ddd' }}>Name</th>
                                        <th style={{ padding: '10px', border: '1px solid #ddd' }}>Email</th>
                                        <th style={{ padding: '10px', border: '1px solid #ddd' }}>Reg Date</th>
                                        <th style={{ padding: '10px', border: '1px solid #ddd' }}>Payment</th>
                                        <th style={{ padding: '10px', border: '1px solid #ddd' }}>Attendance</th>
                                        {event.customForm && event.customForm.length > 0 && (
                                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Form</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {individualParticipants.map(r => renderParticipantRow(r))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}

                {/* Teams View */}
                {activeTab === 'teams' && event.isTeamEvent && (
                    teamsList.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No teams found.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {teamsList.map(teamGrp => (
                                <div key={teamGrp.id} style={{ border: '1px solid #cce5ff', borderRadius: '8px', overflow: 'hidden' }}>
                                    <div style={{ background: '#e6f2ff', padding: '12px 15px', borderBottom: '1px solid #cce5ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong style={{ color: '#004085' }}>Team: {teamGrp.name}</strong>
                                            <span style={{ marginLeft: '10px', fontSize: '12px', color: '#555' }}>
                                                ({teamGrp.members.length} member{teamGrp.members.length > 1 ? 's' : ''})
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ background: '#fafafa', textAlign: 'left' }}>
                                                    <th style={{ padding: '10px', borderBottom: '1px solid #ddd', borderRight: '1px solid #eee' }}>Name</th>
                                                    <th style={{ padding: '10px', borderBottom: '1px solid #ddd', borderRight: '1px solid #eee' }}>Email</th>
                                                    <th style={{ padding: '10px', borderBottom: '1px solid #ddd', borderRight: '1px solid #eee' }}>Reg Date</th>
                                                    <th style={{ padding: '10px', borderBottom: '1px solid #ddd', borderRight: '1px solid #eee' }}>Payment</th>
                                                    <th style={{ padding: '10px', borderBottom: '1px solid #ddd', borderRight: '1px solid #eee' }}>Attendance</th>
                                                    {event.customForm && event.customForm.length > 0 && (
                                                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Form</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {teamGrp.members.map(r => renderParticipantRow(r, true))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Reject Modal */}
            {rejectRegId && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '400px', width: '90%' }}>
                        <h3 style={{ marginTop: 0 }}>Reject Order</h3>
                        <p style={{ fontSize: '14px', color: '#555' }}>Please provide a reason for rejecting this order. The user will see this comment.</p>
                        <textarea
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            placeholder="e.g., Sold out of requested size"
                            style={{ width: '100%', padding: '10px', height: '80px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '15px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => { setRejectRegId(null); setRejectComment(''); }} style={{ padding: '8px 16px', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleRejectOrder} disabled={statusUpdating} style={{ padding: '8px 16px', background: '#d9534f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                {statusUpdating ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Helper to render a participant row to avoid duplication
    function renderParticipantRow(r, isTeamView = false) {
        const p = r.participant;
        const hasResponses = r.formResponses && Object.keys(r.formResponses).length > 0;
        const isExpanded = expandedRows[r._id];
        const colCount = 5 + (event.customForm && event.customForm.length > 0 ? 1 : 0);
        return (
            <React.Fragment key={r._id}>
                <tr>
                    <td style={{ padding: '10px', border: isTeamView ? 'none' : '1px solid #ddd', borderRight: isTeamView ? '1px solid #eee' : '1px solid #ddd', borderBottom: '1px solid #eee' }}>
                        {p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : 'Unknown'}
                    </td>
                    <td style={{ padding: '10px', border: isTeamView ? 'none' : '1px solid #ddd', borderRight: isTeamView ? '1px solid #eee' : '1px solid #ddd', borderBottom: '1px solid #eee' }}>{p?.email || '-'}</td>
                    <td style={{ padding: '10px', border: isTeamView ? 'none' : '1px solid #ddd', borderRight: isTeamView ? '1px solid #eee' : '1px solid #ddd', borderBottom: '1px solid #eee' }}>
                        {r.registeredAt ? new Date(r.registeredAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}
                    </td>
                    <td style={{ padding: '10px', border: isTeamView ? 'none' : '1px solid #ddd', borderRight: isTeamView ? '1px solid #eee' : '1px solid #ddd', borderBottom: '1px solid #eee' }}>
                        <span style={{
                            padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                            background: r.status === 'pending_approval' ? '#fcf8e3' : r.status === 'rejected' ? '#f2dede' : r.status === 'approved' ? '#dff0d8' : r.paymentStatus === 'paid' ? '#dff0d8' : '#fcf8e3',
                            color: r.status === 'pending_approval' ? '#8a6d3b' : r.status === 'rejected' ? '#a94442' : r.status === 'approved' ? '#3c763d' : r.paymentStatus === 'paid' ? '#3c763d' : '#8a6d3b',
                        }}>
                            {r.status === 'pending_approval' || r.status === 'approved' || r.status === 'rejected' ? r.status.replace('_', ' ') : r.paymentStatus}
                        </span>
                    </td>
                    <td style={{ padding: '10px', border: isTeamView ? 'none' : '1px solid #ddd', borderRight: isTeamView ? '1px solid #eee' : '1px solid #ddd', borderBottom: '1px solid #eee' }}>
                        {r.attended ? 'Yes' : 'No'}
                    </td>
                    {event.customForm && event.customForm.length > 0 && (
                        <td style={{ padding: '10px', border: isTeamView ? 'none' : '1px solid #ddd', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                            {hasResponses ? (
                                <button onClick={() => setExpandedRows(prev => ({ ...prev, [r._id]: !prev[r._id] }))}
                                    style={{ padding: '3px 10px', fontSize: '12px', cursor: 'pointer', background: isExpanded ? '#337ab7' : '#eee', color: isExpanded ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '3px' }}>
                                    {isExpanded ? 'Hide' : 'View'}
                                </button>
                            ) : (
                                <span style={{ color: '#999', fontSize: '11px' }}>N/A</span>
                            )}
                        </td>
                    )}
                </tr>
                {isExpanded && hasResponses && (
                    <tr>
                        <td colSpan={colCount} style={{ padding: '12px 20px', background: '#f9f9f9', border: '1px solid #ddd' }}>
                            <strong style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '8px' }}>Form Responses</strong>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                                {Object.entries(r.formResponses).map(([key, val]) => {
                                    const isFileUrl = typeof val === 'string' && val.startsWith('http');
                                    const isFileObj = val && typeof val === 'object' && val.url;

                                    return (
                                        <div key={key} style={{ fontSize: '13px', marginBottom: '4px' }}>
                                            <span style={{ color: '#888', fontWeight: 'bold' }}>{key}:</span>{' '}
                                            {(isFileUrl || isFileObj) ? (
                                                <button type="button" onClick={() => openFile(val)} style={{ background: 'none', border: 'none', color: '#337ab7', fontWeight: 'bold', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                                                    View Uploaded File
                                                </button>
                                            ) : (
                                                Array.isArray(val) ? val.join(', ') : String(val)
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </td>
                    </tr>
                )}

                {/* Merch Order Review Row */}
                {event.type === 'merchandise' && r.merchandiseSelections && r.merchandiseSelections.length > 0 && (
                    <tr>
                        <td colSpan={colCount} style={{ padding: '12px 20px', background: '#fffbeb', border: '1px solid #ddd' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <strong style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '8px' }}>Merch Order</strong>
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                                        {r.merchandiseSelections.map((sel, idx) => (
                                            <li key={idx}>
                                                {sel.quantity}x {sel.itemName} {sel.size && `(${sel.size})`} {sel.color && `[${sel.color}]`}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {r.status === 'pending_approval' && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleApproveOrder(r._id)} style={{ padding: '6px 12px', background: '#5cb85c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Approve</button>
                                        <button onClick={() => setRejectRegId(r._id)} style={{ padding: '6px 12px', background: '#d9534f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Reject</button>
                                    </div>
                                )}
                                {r.status === 'rejected' && r.rejectionComment && (
                                    <div style={{ color: '#a94442', fontSize: '12px', maxWidth: '300px' }}>
                                        <strong>Rejected:</strong> {r.rejectionComment}
                                    </div>
                                )}
                            </div>
                        </td>
                    </tr>
                )}
            </React.Fragment>
        );
    }
}
