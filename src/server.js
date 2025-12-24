const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const pool = require('./db');

const app = express();
app.use(express.json());
app.use(cors()); // Allow all origins for demo

// Routes
// app.post('/api/links', async (req, res) => {
//     const { url, remarks } = req.body;
//     try {
//         let siteName = "Unknown Site";
//         try {
//             const { data } = await axios.get(url);
//             const $ = cheerio.load(data);
//             siteName = $('head > title').text() || "No Title";
//         } catch (e) { console.log("Scrape failed"); }

//         const newLink = await pool.query(
//             "INSERT INTO links (site_name, original_url, remarks) VALUES ($1, $2, $3) RETURNING *",
//             [siteName, url, remarks]
//         );
//         res.json(newLink.rows[0]);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send("Server Error");
//     }
// });

// app.post('/api/links', async (req, res) => {
//     const { url, remarks } = req.body;
    
//     // 1. DEFAULT NAME (In case scraping fails)
//     let siteName = "Unknown Site";

//     try {
//         console.log(`🔍 Attempting to scrape: ${url}`);
        
//         // 2. FAKE A BROWSER (User-Agent)
//         // Many sites block default requests. We must pretend to be Chrome.
//         const { data } = await axios.get(url, {
//             headers: {
//                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
//             },
//             timeout: 5000 // Don't wait forever
//         });

//         // 3. PARSE HTML
//         const $ = cheerio.load(data);
//         const title = $('head > title').text().trim();
        
//         if (title) {
//             siteName = title;
//             console.log(`✅ Found title: ${siteName}`);
//         }
//     } catch (scrapeError) {
//         console.log(`⚠️ Scraping failed for ${url}: ${scrapeError.message}`);
//         // We continue anyway! We don't want the save to fail just because the name failed.
//     }

//     try {
//         // 4. SAVE TO DB
//         const newLink = await pool.query(
//             "INSERT INTO links (site_name, original_url, remarks) VALUES ($1, $2, $3) RETURNING *",
//             [siteName, url, remarks]
//         );
//         res.json(newLink.rows[0]);
//     } catch (dbError) {
//         console.error(dbError);
//         res.status(500).send("Database Error");
//     }
// });


// 1. NEW ENDPOINT: Scrape Title Only
app.post('/api/scrape', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
        // Scrape Logic
        const { data } = await axios.get(url, {
            timeout: 3000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            }, 
            family: 4
        });
        
        const $ = cheerio.load(data);
        const title = $('head > title').text().trim() || "Unknown Site";
        
        res.json({ title }); // Return title to frontend
    } catch (err) {
        console.log("Scrape failed:", err.message);
        res.json({ title: "" }); // Return empty string so user can fill manually
    }
});

// 2. UPDATED ENDPOINT: Save Link
app.post('/api/links', async (req, res) => {
    // Now we accept site_name from the frontend!
    const { url, remarks, site_name } = req.body;

    // Use user input OR fallback to "Unknown"
    const finalName = site_name || "Unknown Site";

    try {
        const newLink = await pool.query(
            "INSERT INTO links (site_name, original_url, remarks) VALUES ($1, $2, $3) RETURNING *",
            [finalName, url, remarks]
        );
        res.json(newLink.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Database Error");
    }
});

app.get('/api/links', async (req, res) => {
    const allLinks = await pool.query("SELECT * FROM links ORDER BY created_at DESC");
    res.json(allLinks.rows);
});

app.listen(5000, () => console.log("Server on port 5000"));