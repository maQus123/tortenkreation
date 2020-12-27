const Filesystem = require('fs');
const Handlebars = require('handlebars');
const Contentful = require("contentful");
const Dotenv = require('dotenv');
const Fetch = require('node-fetch');

const path = {
    dist: './dist',
    templates: './src/templates',
    assets: './assets'
};

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
            `${path.dist}/img/${item.fields.slug}-thumb.jpg`);
        item.fields.images.forEach((image, i) => {
            downloadImage(
                `https:${image.fields.file.url}?fm=jpg&q=90&w=1500&h=1125`,
                `${path.dist}/img/${item.fields.slug}-${i}.jpg`);
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

function initDist() {
    Filesystem.rmdirSync(path.dist, { recursive: true });
    Filesystem.mkdirSync(path.dist);
    Filesystem.mkdirSync(`${path.dist}/torten`);
    Filesystem.mkdirSync(`${path.dist}/img`);
    Filesystem.readdir(path.assets, function (err, files) {
        if (err) return console.log(err);
        files.forEach(function (file) {
            Filesystem.copyFile(path.assets + '/' + file, path.dist + '/' + file, function (err) {
                if (err) return console.log(err);
            });
        });
    });
}

(function () {
    initDist();
    Dotenv.config();
    Handlebars.registerPartial('header', Filesystem.readFileSync(`${path.templates}/_header.html`, 'utf8').toString());
    Handlebars.registerPartial('nav', Filesystem.readFileSync(`${path.templates}/_nav.html`, 'utf8').toString());
    Handlebars.registerPartial('footer', Filesystem.readFileSync(`${path.templates}/_footer.html`, 'utf8').toString());
    getData().then(data => {
        downloadImages(data.items);
        generateHtml(`${path.templates}/torten.html`, `${path.dist}/torten.html`, data);
        generateHtml(`${path.templates}/index.html`, `${path.dist}/index.html`, data);
        data.items.forEach(item => {
            generateHtml(`${path.templates}/torte.html`, `${path.dist}/torten/${item.fields.slug}.html`, item);
        });
    });
})();