export default {
  async fetch(request: Request): Promise<Response> {
    return new Response("Worker online ✅", { status: 200 });
  },
};