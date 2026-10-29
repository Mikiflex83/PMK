/* Adaptateur réservé au socle PMK : données dans le Koha de la session. */
(function () {
    'use strict';
    if (window.PMKConfigNativeStorage) return;
    const revisions = new Map();
    const snapshots = new Map();
    const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
    const apiRoot = '/api/v1/contrib/pmk/documents/';
    let initialDocuments = null;
    const initialConsumed = new Set();
    async function preload() {
        try {
            const result = await request('', {url:'/api/v1/contrib/pmk/configuration'});
            if (!result.documents || typeof result.documents !== 'object' || Array.isArray(result.documents)) throw new Error('invalid_configuration_snapshot');
            initialDocuments = result.documents;
        } catch (error) {
            // Older backend or transient failure: individual fresh reads remain available.
            console.warn('[PMK] Lecture groupée indisponible',error);
        }
    }
    async function request(key, options) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        try {
            const response = await fetch(options?.url || apiRoot + encodeURIComponent(key), Object.assign({
                credentials: 'same-origin', signal: controller.signal,
                headers: {'Accept':'application/json', 'Content-Type':'application/json', 'X-PMK-Request':'1'}
            }, options));
            const result = await response.json();
            if (!response.ok) {
                const error = new Error(result.error || ('Koha HTTP ' + response.status));
                error.code = result.error || 'koha_storage_failed';
                error.status = response.status;
                throw error;
            }
            return result;
        } finally { clearTimeout(timer); }
    }
    function documentRef(key) {
        return {
            key,
            async get(options) {
                // Use the page's initial snapshot once only. Later reads, including
                // persistence checks and transaction retries, always reach Koha.
                let result;
                if (!options?.fresh && initialDocuments && !key.startsWith('147-favorites-') && !initialConsumed.has(key)) {
                    initialConsumed.add(key);
                    result = Object.hasOwn(initialDocuments,key) ? initialDocuments[key] : {exists:false,data:null,revision:0};
                } else result = await request(key);
                revisions.set(key, result.revision);
                snapshots.set(key,copy(result.data));
                return {exists:result.exists, revision:result.revision, data:() => copy(result.data)};
            },
            async set(value, options) {
                let data = copy(value);
                // Les métadonnées hors config et les clés inconnues sont conservées.
                if (!revisions.has(key)) await this.get();
                if (options?.merge) data = Object.assign({}, snapshots.get(key) || {}, data);
                const result = await request(key, {method:'PUT', body:JSON.stringify({data, revision:options?.expectedRevision ?? revisions.get(key)})});
                revisions.set(key, result.revision);
                snapshots.set(key,copy(data));
            }
        };
    }
    const db = {
        collection(name) {
            if (name !== 'pimpmykoha_preplugin_modules') throw new Error('pmk_native_collection_unsupported');
            return {doc:documentRef};
        },
        async runTransaction(callback) {
            for (let attempt = 0; attempt < 3; attempt++) {
                const reads = new Map(), writes = [];
                const result = await callback({
                    async get(ref) { const snap = await ref.get(); reads.set(ref.key, {snap, revision:snap.revision}); return snap; },
                    set(ref, value, options) { writes.push({ref,value,options}); }
                });
                if (writes.length > 1) throw new Error('pmk_native_single_document_transaction');
                try {
                    for (const {ref,value,options} of writes) {
                        const read = reads.get(ref.key);
                        if (!read) throw new Error('pmk_native_read_before_write');
                        const data = options?.merge ? Object.assign({},read.snap.data() || {},copy(value)) : copy(value);
                        const saved = await request(ref.key, {method:'PUT',body:JSON.stringify({data,revision:read.revision})});
                        revisions.set(ref.key,saved.revision);
                        snapshots.set(ref.key,copy(data));
                    }
                    return result;
                } catch (error) { if (error.status !== 409 || attempt === 2) throw error; }
            }
        }
    };
    window.PMKConfigNativeStorage = Object.freeze({
        kind:'koha', db, preload,
        serverTimestamp:() => new Date().toISOString()
    });
})();
