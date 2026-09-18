async function sendWeeklyReport(env) {

    // --------------------------------------------------
    // 1. Lasketaan viimeisen 7 päivän käynnit
    // --------------------------------------------------

    const currentWeek = await env.DB.prepare(`
        SELECT COUNT(*) AS visits
        FROM pageviews
        WHERE timestamp >= datetime('now', '-7 days')
    `).first();


    // --------------------------------------------------
    // 2. Lasketaan sitä edeltävän 7 päivän käynnit
    // --------------------------------------------------

    const previousWeek = await env.DB.prepare(`
        SELECT COUNT(*) AS visits
        FROM pageviews
        WHERE timestamp >= datetime('now', '-14 days')
          AND timestamp < datetime('now', '-7 days')
    `).first();


    const visits = currentWeek.visits;
    const previousVisits = previousWeek.visits;


    // --------------------------------------------------
    // 3. Lasketaan prosentuaalinen muutos
    // --------------------------------------------------

    let changeText = "No comparison data";

    if (previousVisits > 0) {

        const change =
            ((visits - previousVisits) / previousVisits) * 100;

        const sign = change >= 0 ? "+" : "";

        changeText = `${sign}${change.toFixed(1)} %`;
    }


    // --------------------------------------------------
    // 4. Muodostetaan raportointijakson päivämäärät
    //
    // Cron ajetaan maanantaisin.
    // Raportissa näytetään edellisen viikon
    // maanantai–sunnuntai.
    // --------------------------------------------------

    const now = new Date();

    const endDate = new Date(now);
    endDate.setUTCDate(endDate.getUTCDate() - 1);

    const startDate = new Date(now);
    startDate.setUTCDate(startDate.getUTCDate() - 7);


    const formatDate = (date) =>
        `${date.getUTCDate()}.${date.getUTCMonth() + 1}.${date.getUTCFullYear()}`;


    const reportingPeriod =
        `${formatDate(startDate)}–${formatDate(endDate)}`;


    // --------------------------------------------------
    // 5. Lähetetään raportti Resend API:n kautta
    // --------------------------------------------------

    const response = await fetch(
        "https://api.resend.com/emails",
        {
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
                    <h2>Nuutti Maikola – Weekly Website Report</h2>

                    <p>
                        <strong>${reportingPeriod}</strong>
                    </p>

                    <p>
                        Website visits:
                        <strong>${visits}</strong>
                    </p>

                    <p>
                        Previous week:
                        <strong>${previousVisits}</strong>
                    </p>

                    <p>
                        Change:
                        <strong>${changeText}</strong>
                    </p>
                `
            })
        }
    );


    // Jos Resend palauttaa virheen,
    // tallennetaan virheen sisältö Worker-lokiin.

    if (!response.ok) {

        const error = await response.text();

        throw new Error(`Resend error: ${error}`);
    }


    return {
        reportingPeriod,
        visits,
        previousVisits,
        changeText
    };
}



// ======================================================
// WORKER
// ======================================================

export default {


    // --------------------------------------------------
    // HTTP-pyynnöt
    // --------------------------------------------------

    async fetch(request, env) {

        const url = new URL(request.url);


        // --------------------------------------------------
        // Kävijälaskuri
        //
        // index.html lähettää POST-pyynnön tähän aina,
        // kun etusivu ladataan.
        // --------------------------------------------------

        if (
            url.pathname === "/api/visit" &&
            request.method === "POST"
        ) {

            await env.DB
                .prepare("INSERT INTO pageviews DEFAULT VALUES")
                .run();


            return new Response(
                "Visit recorded",
                {
                    status: 200
                }
            );
        }


        // --------------------------------------------------
        // VÄLIAIKAINEN TESTIREITTI
        //
        // Tämän avulla voimme testata viikkoraportin
        // lähettämisen selaimesta ennen Cronin käyttöönottoa.
        //
        // POISTETAAN, kun Resend-testi on onnistunut.
        // --------------------------------------------------

        if (
            url.pathname === "/api/test-weekly-report" &&
            request.method === "GET"
        ) {

            try {

                const report =
                    await sendWeeklyReport(env);


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


        // --------------------------------------------------
        // Kaikki muut pyynnöt ohjataan normaalille
        // staattiselle verkkosivustolle.
        // --------------------------------------------------

        return env.ASSETS.fetch(request);
    },



    // --------------------------------------------------
    // CRON TRIGGER
    //
    // Cloudflare käynnistää tämän automaattisesti
    // wrangler.jsonc-tiedoston Cron-asetuksen perusteella.
    //
    // Cron:
    // 0 7 * * MON
    //
    // = joka maanantai klo 07:00 UTC
    // --------------------------------------------------

    async scheduled(event, env, ctx) {

        ctx.waitUntil(
            sendWeeklyReport(env)
        );
    }
};