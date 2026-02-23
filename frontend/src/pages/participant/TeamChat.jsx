import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';

export default function TeamChat() {
    const { teamId } = useParams();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [team, setTeam] = useState(null);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [typing, setTyping] = useState(false);
    const scrollRef = useRef();
    const pollRef = useRef();
    const { showAlert } = useDialog();

    useEffect(() => {
        api.get(`/teams/${teamId}`).then(res => setTeam(res.data)).catch(() => { });
        loadMessages();

        // Poll for new messages every 3 seconds (real-time via polling)
        pollRef.current = setInterval(loadMessages, 3000);
        return () => clearInterval(pollRef.current);
    }, [teamId]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function loadMessages() {
        try {
            const res = await api.get(`/chat/${teamId}/messages`);
            setMessages(res.data);
        } catch (err) {
            console.error('Failed to load messages', err);
        }
    }

    async function sendMessage(e) {
        e.preventDefault();
        if (!input.trim() || sending) return;
        setSending(true);

        try {
            await api.post(`/chat/${teamId}/send`, { message: input.trim() });
            setInput('');
            loadMessages();
        } catch (err) {
            showAlert(err.response?.data?.error || 'Failed to send message');
        }
        setSending(false);
    }

    // Detect link patterns
    function renderText(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, i) =>
            urlRegex.test(part)
                ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#337ab7', textDecoration: 'underline' }}>{part}</a>
                : part
        );
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <Link to="/teams" style={{ color: '#337ab7', textDecoration: 'none', fontSize: '14px' }}>← Back to My Teams</Link>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', marginBottom: '15px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>{team?.name || 'Team'} Chat</h2>
                    {team && (
                        <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                            Event: {team.event?.name} • {(team.members?.length || 0) + 1} members
                        </div>
                    )}
                </div>
                <div style={{ fontSize: '11px', color: '#888', background: '#e8f5e9', padding: '4px 10px', borderRadius: '12px' }}>
                    Live
                </div>
            </div>

            {/* Online Members */}
            {team && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', padding: '3px 10px', background: '#e3f2fd', borderRadius: '12px', color: '#1565c0' }}>
                        {team.leader?.firstName} {team.leader?.lastName} (Leader)
                    </span>
                    {team.members?.filter(m => m.status === 'accepted').map((m, i) => (
                        <span key={i} style={{ fontSize: '12px', padding: '3px 10px', background: '#f5f5f5', borderRadius: '12px', color: '#666' }}>
                            {m.user?.firstName} {m.user?.lastName}
                        </span>
                    ))}
                </div>
            )}

            {/* Chat Window */}
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: '500px', background: '#fff' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#ccc', marginTop: '100px' }}>
                            No messages yet. Start the conversation!
                        </div>
                    ) : messages.map((m, i) => {
                        const senderId = m.sender?._id || m.sender;
                        const isMe = senderId === user?._id;
                        const senderName = m.sender?.firstName
                            ? `${m.sender.firstName} ${m.sender.lastName}`
                            : (m.senderName || 'Unknown');

                        return (
                            <div key={m._id || i} style={{
                                display: 'flex',
                                justifyContent: isMe ? 'flex-end' : 'flex-start',
                                marginBottom: '10px'
                            }}>
                                <div style={{
                                    background: isMe ? '#dcf8c6' : '#f1f0f0',
                                    padding: '10px 14px',
                                    borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                    maxWidth: '70%',
                                    boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
                                }}>
                                    {!isMe && (
                                        <div style={{ fontSize: '11px', color: '#337ab7', fontWeight: 'bold', marginBottom: '3px' }}>
                                            {senderName}
                                        </div>
                                    )}
                                    <div style={{ lineHeight: '1.4', wordBreak: 'break-word' }}>
                                        {renderText(m.message || m.text || '')}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#999', marginTop: '4px', textAlign: 'right' }}>
                                        {new Date(m.sentAt || m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={scrollRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} style={{
                    borderTop: '1px solid #ddd', padding: '10px 15px',
                    background: '#fafafa', display: 'flex', gap: '10px',
                    borderRadius: '0 0 8px 8px'
                }}>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type a message... (URLs auto-link)"
                        style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '20px', outline: 'none' }}
                    />
                    <button type="submit" disabled={sending || !input.trim()}
                        style={{
                            padding: '10px 20px', background: '#337ab7', color: '#fff',
                            border: 'none', borderRadius: '20px', cursor: 'pointer',
                            opacity: !input.trim() ? 0.5 : 1
                        }}>
                        {sending ? '...' : 'Send'}
                    </button>
                </form>
            </div>

            <div style={{ marginTop: '8px', fontSize: '11px', color: '#aaa', textAlign: 'center' }}>
                Messages refresh automatically every 3 seconds
            </div>
        </div>
    );
}
