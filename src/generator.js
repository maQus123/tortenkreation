const Filesystem = require('fs');
const Handlebars = require('handlebars');
const Contentful = require("contentful");
const Dotenv = require('dotenv');
const Fetch = require('node-fetch');

const paths = {
    dist: './dist',
    assets: './assets',
    templates: './src/templates'
};

function registerPartials() {
    Handlebars.registerPartial('header', Filesystem.readFileSync(`${paths.templates}/_header.html`, 'utf8').toString());
    Handlebars.registerPartial('nav', Filesystem.readFileSync(`${paths.templates}/_nav.html`, 'utf8').toString());
    Handlebars.registerPartial('footer', Filesystem.readFileSync(`${paths.templates}/_footer.html`, 'utf8').toString());
    Handlebars.registerPartial('parallaxContainer', Filesystem.readFileSync(`${paths.templates}/_parallaxContainer.html`, 'utf8').toString());
}

function fetchJsonData() {
    return new Promise((resolve, reject) => {
        const client = Contentful.createClient({
            space: process.env.CONTENTFUL_SPACE_ID,
            accessToken: process.env.CONTENTFUL_ACCESS_TOKEN
        });
        client.getEntries({
            content_type: 'cake',
            order: '-fields.creationDate'
        }).then(data => {
            resolve(data);
        }).catch(err => {
            reject(err);
        });
    });
}

function downloadImages(items) {
    items.forEach(item => {
        downloadImage(
            `https:${item.fields.images[0].fields.file.url}?fm=jpg&q=75&fit=thumb&w=500&h=375`,
            `${paths.dist}/img/${item.fields.slug}-thumb.jpg`);
        item.fields.images.forEach((image, i) => {
            downloadImage(
                `https:${image.fields.file.url}?fm=jpg&q=90&w=1500&h=1125`,
                `${paths.dist}/img/${item.fields.slug}-${i}.jpg`);
        });
    });
}

function downloadImage(sourceUrl, destinationPath) {
    Fetch(sourceUrl).then(response => {
        const stream = Filesystem.createWriteStream(destinationPath);
        response.body.pipe(stream);
    });
}

function generateHtml(sourcePath, destinationPath, data) {
    let source = Filesystem.readFileSync(sourcePath, 'utf8').toString();
    let template = Handlebars.compile(source);
    let html = template(data);
    Filesystem.writeFile(destinationPath, html, () => { });
}

function prepareDistFolder() {
    Filesystem.rmdirSync(paths.dist, { recursive: true });
    Filesystem.mkdirSync(paths.dist);
    Filesystem.mkdirSync(`${paths.dist}/torten`);
    Filesystem.mkdirSync(`${paths.dist}/img`);
}

function copyAssets() {
    Filesystem.readdir(paths.assets, function (err, files) {
        files.forEach(function (file) {
            Filesystem.copyFile(`${paths.assets}/${file}`, `${paths.dist}/${file}`, () => { });
        });
    });
}

function init() {
    Dotenv.config();
    prepareDistFolder();
    copyAssets();
}

(function () {
    init();
    registerPartials();
    fetchJsonData().then(data => {
        downloadImages(data.items);
        generateHtml(`${paths.templates}/torten.html`, `${paths.dist}/torten.html`, data);
        generateHtml(`${paths.templates}/index.html`, `${paths.dist}/index.html`, data);
        data.items.forEach(item => {
            generateHtml(`${paths.templates}/torte.html`, `${paths.dist}/torten/${item.fields.slug}.html`, item);
        });
    });
})();