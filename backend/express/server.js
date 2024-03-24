const express = require('express');
const fs = require('fs');
const axios = require('axios');
const cors = require('cors');
const serverless = require('serverless-http');
const path = require('path');
const fetch = require('node-fetch');
const bodyParser = require('body-parser')



const app = express();

const router = express.Router()
// Define the base URL of your GitHub repository
const GITHUB_REPO_URL = 'https://raw.githubusercontent.com/bugcrowd/templates/master/submissions/description/';

app.use(cors());
app.use(bodyParser.json())

// Load data.json fileconst dataPath = path.join(process.cwd(), "server/data/nfts.json");

const data = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'data.json')));
console.log(__dirname);
// Serve the aliases.json file
router.get('/aliases', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), 'aliases.json'));
});


router.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<h1>Hello from Express.js!</h1>');
    res.end();
  });


  router.get('/markdown/:category?/:subcategory?/:variant?', async (req, res) => {
    const { category, subcategory, variant } = req.params;

    try {
        // Placeholder function findMarkdownUrl
        const markdownUrl = findMarkdownUrl(category, subcategory, variant, data);
        console.log('Markdown url:', markdownUrl);

        if (!markdownUrl) {
            return res.status(404).json({ error: 'Markdown content not found' });
        }

        // Fetch the markdown content from the URL using node-fetch
        const response = await fetch(markdownUrl);
        
        // Check if response is successful
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch markdown content' });
        }

        // Read response body as text
        const responseData = await response.text();

        // Send the markdown content as the response
        res.json({ content: responseData });
    } catch (error) {
        console.error('Error fetching markdown:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Define endpoint to fetch categories hierarchy
router.get('/categories', (req, res) => {
    try {
        const categories = getCategoriesHierarchy(data.content);
        res.json({ categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


router.get('/test-server', async (req, res) => {
    try {
        const response = await fetch('https://example.com/');
        const responseData = await response.json(); // Parse response body as JSON
        console.log('Response status:', response.status);
        res.json({ status: response.status, data: responseData });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Helper function to recursively build categories hierarchy
function getCategoriesHierarchy(entries) {
    return entries.map(entry => {
        const category = {
            name: entry.name,
            id: entry.id
        };
        if (entry.children && entry.children.length > 0) {
            category.children = getCategoriesHierarchy(entry.children);
        } else if (entry.priority !== undefined) {
            category.priority = entry.priority;
        }
        return category;
    });
}

// Helper function to construct the URL of the markdown file based on the hierarchy
function findMarkdownUrl(category, subcategory, variant, data) {
    const categoryEntry = findEntryById(category, data.content);
    if (!categoryEntry) return null;

    const subcategoryEntry = findEntryById(subcategory, categoryEntry.children);
    if (!subcategoryEntry) return null;

    let url = `${GITHUB_REPO_URL}${encodeURIComponent(categoryEntry.id)}/${encodeURIComponent(subcategoryEntry.id)}/`;

    if (variant) {
        const variantEntry = findEntryById(variant, subcategoryEntry.children);
        if (!variantEntry) return null;

        const variantPath = encodeURIComponent(variantEntry.id);
        url += `${variantPath}/`;
    }

    url += 'template.md';

    console.log(url);

    return url;
}


// Helper function to find an entry by id recursively
function findEntryById(id, entries) {

    if (!entries || !Symbol.iterator in Object(entries)) {
        return null;
    }

    for (const entry of entries) {
        if (entry.id === id) {
            return entry;
        }
        if (entry.children) {
            const found = findEntryById(id, entry.children);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', (req, res) => res.sendFile(path.join(process.cwd(), 'index.html')));


module.exports = app;
module.exports.handler = serverless(app);
