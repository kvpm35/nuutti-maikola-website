async function sendWeeklyReport(env) {

    // Käynnit viimeisen 7 päivän ajalta
    const currentWeek = await env.DB.prepare(`
        SELECT COUNT(*) AS visits
        FROM pageviews
        WHERE timestamp >= datetime('now', '-7 days')
    `).first();


    // Käynnit sitä edeltävän 7 päivän ajalta
    const previousWeek = await env.DB.prepare(`
        SELECT COUNT(*) AS visits
        FROM pageviews
        WHERE timestamp >= datetime('now', '-14 days')
          AND timestamp < datetime('now', '-7 days')
    `).first();


    const visits = currentWeek.visits;
    const previousVisits = previousWeek.visits;


    // Lasketaan muutos edelliseen viikkoon
    let changeText = "Ei vertailutietoa";

    if (previousVisits > 0) {

        const change =
            ((visits - previousVisits) / previousVisits) * 100;

        const sign = change >= 0 ? "+" : "";

        changeText = `${sign}${change.toFixed(1)} %`;
    }


    // Lähetetään raportti Resend API:n kautta
    const response = await fetch("https://api.resend.com/emails", {

        method: "POST",

        headers: {
            "Authorization": `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            from:
                "Nuutti Maikola Website <analytics@nuuttimaikola.com>",

            to: [
                "konsta.maikola@kolumbus.fi",
                "nuutti.maikola@kolumbus.fi"
            ],

            subject:
                "Nuutti Maikola – Weekly Website Report",

            html: `
                <h2>Weekly Website Report</h2>

                <p>
                    Website visits during the last 7 days:
                    <strong>${visits}</strong>
                </p>

                <p>
                    Previous 7 days:
                    <strong>${previousVisits}</strong>
                </p>

                <p>
                    Change:
                    <strong>${changeText}</strong>
                </p>
            `
        })
    });


    // Jos Resend palauttaa virheen, tallennetaan virhe lokiin
    if (!response.ok) {

        const error = await response.text();

        throw new Error(`Resend error: ${error}`);
    }


    return {
        visits,
        previousVisits,
        changeText
    };
}



export default {

    // Tämä suoritetaan verkkosivulle tulevien HTTP-pyyntöjen yhteydessä
    async fetch(request, env) {

        const url = new URL(request.url);


        // Normaali kävijälaskuri
        if (
            url.pathname === "/api/visit" &&
            request.method === "POST"
        ) {

            await env.DB
                .prepare("INSERT INTO pageviews DEFAULT VALUES")
                .run();

            return new Response("Visit recorded", {
                status: 200
            });
        }


        // VÄLIAIKAINEN TESTIREITTI
        // Tämän avulla voimme testata sähköpostin heti
        if (
            url.pathname === "/api/test-weekly-report" &&
            request.method === "GET"
        ) {

            try {

                const report = await sendWeeklyReport(env);

                return Response.json({
                    success: true,
                    message: "Weekly report sent",
                    report: report
                });

            } catch (error) {

                return Response.json(
                    {
                        success: false,
                        error: error.message
                    },
                    {
                        status: 500
                    }
                );
            }
        }


        // Kaikki muut pyynnöt ovat normaalin sivuston tiedostoja
        return env.ASSETS.fetch(request);
    },


    // Tämä suoritetaan myöhemmin Cron Triggerin perusteella
    async scheduled(event, env, ctx) {

        ctx.waitUntil(sendWeeklyReport(env));
    }
};