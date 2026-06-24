export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Try to serve the requested file
    let response = await env.ASSETS.fetch(request);
    
    // If it's a 404 and not an asset (no extension or non-asset path), serve index.html for SPA routing
    if (response.status === 404) {
      const pathname = url.pathname;
      // Don't rewrite requests for actual assets with extensions
      if (!pathname.match(/\.\w+$/)) {
        return await env.ASSETS.fetch(new Request(new URL('/index.html', url).toString(), request));
      }
    }
    
    return response;
  }
};