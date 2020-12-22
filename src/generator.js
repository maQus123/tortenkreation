const Filesystem = require('fs');
const Handlebars = require('handlebars');
const Contentful = require("contentful");
const Dotenv = require('dotenv');
const Fetch = require('node-fetch');

const path = {
    dist: './dist',
    distImg: './dist/img',
    distTorten: './dist/torten',
    src: './src'
};

function initDist() {
    Filesystem.rmdirSync(path.dist, { recursive: true });
    Filesystem.mkdirSync(path.dist);
    Filesystem.mkdirSync(path.distTorten);
    Filesystem.mkdirSync(path.distImg);
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
            `${path.distImg}/${item.fields.slug}-thumb.jpg`);
        item.fields.images.forEach((image, i) => {
            downloadImage(
                `https:${image.fields.file.url}?fm=jpg&q=90&w=1500&h=1125`,
                `${path.distImg}/${item.fields.slug}-${i}.jpg`);
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
        generateHtml(`${path.src}/torten.html`, `${path.dist}/torten.html`, data);
        generateHtml(`${path.src}/index.html`, `${path.dist}/index.html`, data);
        data.items.forEach(item => {
            generateHtml(`${path.src}/torte.html`, `${path.distTorten}/${item.fields.slug}.html`, item);
        });
    });
})();