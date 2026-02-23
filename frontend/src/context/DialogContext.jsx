import React, { createContext, useContext, useState, useCallback } from 'react';

const DialogContext = createContext();

export const useDialog = () => {
    return useContext(DialogContext);
};

export const DialogProvider = ({ children }) => {
    const [dialogState, setDialogState] = useState({
        isOpen: false,
        type: 'alert', // 'alert', 'confirm', 'prompt'
        message: '',
        resolve: null,
        defaultValue: '' // for prompt
    });

    const [inputValue, setInputValue] = useState('');

    const showAlert = useCallback((message) => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                type: 'alert',
                message,
                resolve,
                defaultValue: ''
            });
        });
    }, []);

    const showConfirm = useCallback((message) => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                type: 'confirm',
                message,
                resolve,
                defaultValue: ''
            });
        });
    }, []);

    const showPrompt = useCallback((message, defaultValue = '') => {
        return new Promise((resolve) => {
            setInputValue(defaultValue);
            setDialogState({
                isOpen: true,
                type: 'prompt',
                message,
                resolve,
                defaultValue
            });
        });
    }, []);

    const handleClose = (result) => {
        setDialogState(prev => {
            if (prev.resolve) {
                prev.resolve(result);
            }
            return { ...prev, isOpen: false };
        });
        setInputValue('');
    };

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
            {children}
            {dialogState.isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        background: '#fff', padding: '24px', borderRadius: '8px',
                        maxWidth: '400px', width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                        fontFamily: 'sans-serif'
                    }}>
                        <p style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#333', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {dialogState.message}
                        </p>

                        {dialogState.type === 'prompt' && (
                            <input
                                type="text"
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                autoFocus
                                style={{
                                    width: '100%', padding: '10px',
                                    border: '1px solid #ccc', borderRadius: '4px',
                                    marginBottom: '20px', fontSize: '14px',
                                    boxSizing: 'border-box'
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleClose(inputValue);
                                }}
                            />
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            {(dialogState.type === 'confirm' || dialogState.type === 'prompt') && (
                                <button
                                    onClick={() => handleClose(dialogState.type === 'prompt' ? null : false)}
                                    style={{
                                        padding: '8px 16px', background: 'transparent',
                                        color: '#666', border: '1px solid #ccc',
                                        borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                                    }}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={() => handleClose(dialogState.type === 'prompt' ? inputValue : true)}
                                autoFocus={dialogState.type !== 'prompt'}
                                style={{
                                    padding: '8px 16px', background: '#337ab7',
                                    color: '#fff', border: 'none',
                                    borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                                }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};
