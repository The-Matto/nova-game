//Cloudflare Pages Function - runs at the edge, proxies every /api/* request to the Railway
//server. A declarative _redirects rule (200 status) was tried first but never actually proxied
//anything (confirmed live - every /api/* path fell through to the SPA's index.html instead) -
//this does the same job as real code, which doesn't depend on whatever was wrong with that.
export async function onRequest(context : {request : Request}) : Promise<Response> {
    const url = new URL(context.request.url);
    const target = "https://nova-server-production-70d5.up.railway.app" + url.pathname + url.search;

    const headers = new Headers(context.request.headers);
    //Let fetch() derive the right Host for the target itself - forwarding the original
    //nova.mattheritage.dev Host would break TLS/SNI against Railway (same issue the local dev
    //proxy needed changeOrigin for).
    headers.delete("host");

    const method = context.request.method;
    //Without this, fetch() follows a redirect (e.g. the OAuth login/callback endpoints) itself
    //at the edge and hands back the final page's content as if it were this domain's own -
    //"manual" instead relays the raw 3xx so the browser does the actual navigation.
    const init : RequestInit = {method, headers, redirect: "manual"};
    if (method !== "GET" && method !== "HEAD") {
        init.body = await context.request.arrayBuffer();
    }

    return fetch(target, init);
}
