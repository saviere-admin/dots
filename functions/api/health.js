import { json } from './_utils.js';

export async function onRequest(context) {
    return json({ 
        status: "ok", 
        service: "dots-api",
        timestamp: new Date().toISOString() 
    });
}