export default {
    async fetch(request, env) {

        const url = new URL(request.url);

        if (url.pathname === "/api/visit" && request.method === "POST") {

            await env.DB
                .prepare("INSERT INTO pageviews DEFAULT VALUES")
                .run();

            return new Response("Visit recorded", {
                status: 200
            });
        }

        return env.ASSETS.fetch(request);
    }
};