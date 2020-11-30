const Filesystem = require('fs');
const Handlebars = require('handlebars');
const Contentful = require("contentful");
const Dotenv = require('dotenv');
const Fetch = require('node-fetch');

function initDist() {
    Filesystem.rmdirSync('dist', { recursive: true });
    Filesystem.mkdirSync('dist');
    Filesystem.mkdirSync('dist/torten');
    Filesystem.mkdirSync('dist/img');
}

function getData() {
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
            `./dist/img/${item.fields.slug}-thumb.jpg`);
        item.fields.images.forEach((image, i) => {
            downloadImage(
                `https:${image.fields.file.url}?fm=jpg&q=90&w=1500&h=1125`,
                `./dist/img/${item.fields.slug}-${i}.jpg`);
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
    Filesystem.writeFile(destinationPath, html, function (err) {
        if (err) return console.log(err);
    });
}

(function () {
    initDist();
    Dotenv.config();
    getData().then(data => {
        downloadImages(data.items);
        generateHtml('./src/torten.html', './dist/torten.html', data);
        generateHtml('./src/index.html', './dist/index.html', data);
        data.items.forEach(item => {
            generateHtml('./src/torte.html', `./dist/torten/${item.fields.slug}.html`, item);
        });
    });
})();