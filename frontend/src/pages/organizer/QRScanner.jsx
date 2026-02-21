import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QRScanner() {
    const [ticketId, setTicketId] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanMode, setScanMode] = useState(true); // Toggle between Camera / Manual

    const scannerRef = useRef(null);

    useEffect(() => {
        // Initialize Scanner when in Scan Mode
        if (scanMode && !result) {
            // Small timeout to ensure DOM is ready
            const timer = setTimeout(() => {
                if (scannerRef.current) {
                    scannerRef.current.clear(); // Cleanup old instance if any
                }

                const scanner = new Html5QrcodeScanner(
                    "reader",
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    /* verbose= */ false
                );

                scanner.render(onScanSuccess, onScanFailure);
                scannerRef.current = scanner;
            }, 100);

            return () => {
                clearTimeout(timer);
                if (scannerRef.current) {
                    scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
                }
            };
        }
    }, [scanMode, result]);

    // Handle Successful Scan
    async function onScanSuccess(decodedText, decodedResult) {
        if (loading) return; // Prevent double submission

        // Pause scanner logic effectively by processing result
        if (scannerRef.current) {
            scannerRef.current.clear();
        }

        await processAttendance(decodedText);
    }

    function onScanFailure(error) {
        // handle scan failure, usually better to ignore and keep scanning.
        // console.warn(`Code scan error = ${error}`);
    }

    async function processAttendance(tid) {
        setLoading(true);
        setResult(null);
        try {
            // QR codes store JSON like {"ticketId":"TKT-...","event":"...","participant":"..."}
            // Extract just the ticketId from the decoded data
            let extractedId = tid;
            try {
                const parsed = JSON.parse(tid);
                if (parsed.ticketId) extractedId = parsed.ticketId;
            } catch (e) {
                // Not JSON — treat as raw ticket ID (manual entry)
            }
            const res = await api.post('/attendance/mark', { ticketId: extractedId });
            setResult({ type: 'success', message: res.data.message || 'Attendance marked!', details: res.data });
        } catch (err) {
            const msg = err.response?.data?.error || 'Could not mark attendance.';
            setResult({ type: 'error', message: msg });
        }
        setLoading(false);
    }

    async function handleManualSubmit(e) {
        e.preventDefault();
        if (!ticketId.trim()) return;
        await processAttendance(ticketId.trim());
    }

    function resetScanner() {
        setResult(null);
        setTicketId('');
        setScanMode(true);
    }

    return (
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', background: '#fff', borderRadius: '8px' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>QR Attendance Scanner</h1>

            {/* Mode Toggles */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                <button
                    onClick={() => { setScanMode(true); setResult(null); }}
                    style={{
                        padding: '10px 20px',
                        background: scanMode ? '#007bff' : '#eee',
                        color: scanMode ? '#fff' : '#333',
                        border: 'none', borderRadius: '4px', cursor: 'pointer'
                    }}
                >
                    Camera Scan
                </button>
                <button
                    onClick={() => { setScanMode(false); setResult(null); }}
                    style={{
                        padding: '10px 20px',
                        background: !scanMode ? '#007bff' : '#eee',
                        color: !scanMode ? '#fff' : '#333',
                        border: 'none', borderRadius: '4px', cursor: 'pointer'
                    }}
                >
                    Manual Entry
                </button>
            </div>

            {/* Success/Error Result Display */}
            {result ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{
                        padding: '20px', marginBottom: '20px',
                        background: result.type === 'success' ? '#dff0d8' : '#f2dede',
                        color: result.type === 'success' ? '#3c763d' : '#a94442',
                        border: '1px solid', borderColor: result.type === 'success' ? '#d6e9c6' : '#ebccd1',
                        borderRadius: '8px'
                    }}>
                        <h2 style={{ marginTop: 0 }}>{result.type === 'success' ? 'Success!' : 'Error'}</h2>
                        <p style={{ fontSize: '18px' }}>{result.message}</p>
                        {result.details && (
                            <div style={{ marginTop: '10px', fontSize: '14px', textAlign: 'left', display: 'inline-block' }}>
                                <p><strong>Participant:</strong> {result.details.participant?.name}</p>
                                <p><strong>Event:</strong> {result.details.event}</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={resetScanner}
                        style={{ padding: '12px 24px', fontSize: '16px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Scan Next Ticket
                    </button>
                </div>
            ) : (
                <>
                    {/* Camera Scanner Area */}
                    {scanMode && (
                        <div style={{ textAlign: 'center' }}>
                            <div id="reader" style={{ width: '100%', minHeight: '300px', background: '#f0f0f0' }}></div>
                            <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                                Point your camera at a ticket QR code.
                            </p>
                        </div>
                    )}

                    {/* Manual Entry Form */}
                    {!scanMode && (
                        <form onSubmit={handleManualSubmit}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Ticket ID</label>
                                <input
                                    type="text"
                                    value={ticketId}
                                    onChange={e => setTicketId(e.target.value)}
                                    placeholder="e.g. TICKET-12345678"
                                    style={{ width: '100%', padding: '12px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{ width: '100%', padding: '12px', fontSize: '16px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                {loading ? 'Processing...' : 'Mark Attendance'}
                            </button>
                        </form>
                    )}
                </>
            )}
        </div>
    );
}
