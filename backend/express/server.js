const express = require('express');
const fs = require('fs');
const axios = require('axios');
const cors = require('cors');
const serverless = require('serverless-http');
const path = require('path');


const app = express();

const router = express.Router()
// Define the base URL of your GitHub repository
const GITHUB_REPO_URL = 'https://raw.githubusercontent.com/bugcrowd/templates/master/submissions/description/';

app.use(cors());


// Load data.json file
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json')));

// Serve the aliases.json file
router.get('/aliases', (req, res) => {
    res.sendFile(path.join(__dirname, 'aliases.json'));
});


router.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<h1>Hello from Express.js!</h1>');
    res.end();
  });


// Define endpoint to fetch markdown content
router.get('/markdown/:category/:subcategory/:variant?', async (req, res) => {
    const { category, subcategory, variant } = req.params;

    try {
        // Find the entry in data.json with the matching ids
        const markdownUrl = findMarkdownUrl(category, subcategory, variant, data);
        if (!markdownUrl) {
            return res.status(404).json({ error: 'Markdown content not found' });
        }

        // Fetch the markdown content from the URL using axios
        const response = await axios.get(markdownUrl);
        if (!response.data) {
            return res.status(404).json({ error: 'Markdown content not found' });
        }

        // Send the markdown content as the response
        res.json({ content: response.data });
    } catch (error) {
        console.error(error);
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

    // console.log(url);

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
app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));


module.exports = app;
module.exports.handler = serverless(app);