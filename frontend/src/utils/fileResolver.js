import api from '../api/axios';

/**
 * Resolves the canonical file URL with the backend and opens it securely.
 * @param {string|object} fileObj - legacy URL string or { url, publicId, resourceType } 
 */
export const openFile = async (fileObj) => {
    try {
        if (!fileObj) return;

        let payload = {};
        if (typeof fileObj === 'string') {
            payload = { url: fileObj };
        } else {
            payload = {
                url: fileObj.url,
                publicId: fileObj.publicId,
                resourceType: fileObj.resourceType,
            };
        }

        const res = await api.post('/upload/resolve', payload);
        if (res.data && res.data.url) {
            window.open(res.data.url, '_blank', 'noopener,noreferrer');
        } else {
            window.open(payload.url, '_blank', 'noopener,noreferrer');
        }
    } catch (err) {
        console.error('Failed to resolve file URL', err);
        // Fallback
        if (typeof fileObj === 'string') {
            window.open(fileObj, '_blank', 'noopener,noreferrer');
        } else if (fileObj?.url) {
            window.open(fileObj.url, '_blank', 'noopener,noreferrer');
        }
    }
};
