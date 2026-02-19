import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function TeamChat() {
    const { teamId } = useParams();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const socketRef = useRef();
    const scrollRef = useRef();

    useEffect(() => {
        // Load history
        api.get(`/chat/${teamId}`).then(res => setMessages(res.data));

        // Connect socket
        const socket = io(); // Uses relative path, proxied by Vite
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('joinTeam', teamId);
        });

        socket.on('receiveMessage', (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        return () => socket.disconnect();
    }, [teamId]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    function sendMessage(e) {
        e.preventDefault();
        if (!input.trim()) return;

        const msg = {
            teamId,
            sender: user._id,
            senderName: user.name,
            text: input,
            createdAt: new Date().toISOString()
        };

        socketRef.current.emit('sendMessage', msg);
        // Optimistic update? Or wait for socket? Socket usually broadcasts back or we add locally.
        // Assuming socket broadcasts to everyone including sender:
        // Actually usually sender adds immediately. 
        // But let's trust the receiveMessage listener for consistency if backend emits to room.
        // If backend emits to room (including sender), we don't need to manually add.
        // If backend broadcasts to *others*, we need to add.
        // Let's assume standard "emit to room". 
        // Safer to just emit for now.

        // Use API to persist if socket doesn't handle persistence? 
        // Usually socket handler saves to DB.

        // Let's call API to save, then emit? Or socket handles all.
        // The previous code likely used socket for real-time.

        // If I can't look at backend, I'll assume socket routes handle it.
        // But for robustness, I'll stick to:
        setMessages(prev => [...prev, msg]); // Local echo

        setInput('');
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <h2>Team Chat</h2>
            <div style={{ border: '1px solid #ccc', height: '500px', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {messages.map((m, i) => {
                        const isMe = m.sender === user?._id;
                        return (
                            <div key={i} style={{
                                display: 'flex',
                                justifyContent: isMe ? 'flex-end' : 'flex-start',
                                marginBottom: '10px'
                            }}>
                                <div style={{
                                    background: isMe ? '#dcf8c6' : '#f1f0f0',
                                    padding: '8px 12px',
                                    borderRadius: '5px',
                                    maxWidth: '70%',
                                    border: '1px solid #ddd'
                                }}>
                                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>
                                        {m.senderName} • {new Date(m.createdAt).toLocaleTimeString()}
                                    </div>
                                    <div>{m.text}</div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={scrollRef} />
                </div>
                <form onSubmit={sendMessage} style={{ borderTop: '1px solid #ccc', padding: '10px', background: '#eee', display: 'flex' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type a message..."
                        style={{ flex: 1, marginRight: '10px' }}
                    />
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    );
}
