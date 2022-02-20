const Filesystem = require('fs');
const Handlebars = require('handlebars');
const Contentful = require("contentful");
const Dotenv = require('dotenv');
const Fetch = require('node-fetch');
const Minify = require('html-minifier').minify;
const Rss = require("rss");

const paths = {
    dist: './dist',
    assets: './assets',
    templates: './src/templates',
    imageZoom: './node_modules/fast-image-zoom/dist'
};

function registerPartials() {
    Handlebars.registerPartial('header', Filesystem.readFileSync(`${paths.templates}/_header.html`, 'utf8').toString());
    Handlebars.registerPartial('nav', Filesystem.readFileSync(`${paths.templates}/_nav.html`, 'utf8').toString());
    Handlebars.registerPartial('footer', Filesystem.readFileSync(`${paths.templates}/_footer.html`, 'utf8').toString());
}

function registerHelpers() {
    Handlebars.registerHelper('date', function (dateString) {
        var date = new Date(dateString);
        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();
        return `${day}.${month}.${year}`;
    });
    Handlebars.registerHelper('descriptionHtml', function (descriptionJson) {
        var html = '';
        if (!descriptionJson || descriptionJson.content === undefined) return '<p></p>';
        descriptionJson.content.forEach(paragraph => {
            html += '<p>';
            paragraph.content.forEach(node => {
                if (node.nodeType == 'hyperlink') {
                    html += '<a href="';
                    html += node.data.uri;
                    html += '">';
                    html += node.content[0].value;
                    html += '</a>';
                } else {
                    if (typeof node.marks !== 'undefined' && node.marks.length > 0) {
                        node.marks.forEach(mark => {
                            html += getMarkHtml(mark.type);
                        });
                        html += node.value;
                        node.marks.forEach(mark => {
                            html += getMarkHtml(mark.type, true);
                        });
                    } else {
                        html += node.value;
                    }
                }
            });
            html += '</p>';
        });
        return html;
    });
    Handlebars.registerHelper('descriptionRaw', function (descriptionJson) {
        return getDescriptionRaw(descriptionJson);
    });
    Handlebars.registerHelper('pinterestLink', function (item) {
        return `https://pinterest.com/pin/create/button/?url=${process.env.ROOT_URL}/torten/${item.slug}.html&media=${process.env.ROOT_URL}/img/${item.slug}-1.jpg&description=${encodeURI(item.title)}`;
    });
    Handlebars.registerHelper('twitterLink', function (item) {
        return `https://twitter.com/intent/tweet?text=${encodeURI(item.title)}&url=${process.env.ROOT_URL}/torten/${item.slug}.html`;
    });
    Handlebars.registerHelper('facebookLink', function (item) {
        return `https://www.facebook.com/sharer/sharer.php?u=${process.env.ROOT_URL}/torten/${item.slug}.html`;
    });
    Handlebars.registerHelper('whatsappLink', function (item) {
        return `whatsapp://send?text=${encodeURI(item.title)}: ${process.env.ROOT_URL}/torten/${item.slug}.html`;
    });
    Handlebars.registerHelper('contactEmail', function () {
        return process.env.CONTACTEMAIL;
    });
    Handlebars.registerHelper('contactName', function () {
        return process.env.CONTACTNAME;
    });
    Handlebars.registerHelper('rootUrl', function () {
        return process.env.ROOT_URL;
    });
    Handlebars.registerHelper('concat', function () {
        var outStr = '';
        for (var arg in arguments) {
            if (typeof arguments[arg] != 'object') {
                outStr += arguments[arg];
            }
        }
        return outStr;
    });
}

function getDescriptionRaw(descriptionJson) {
    var text = '';
    if (!descriptionJson || descriptionJson.content === undefined) return text;
    descriptionJson.content.forEach(paragraph => {
        paragraph.content.forEach(node => {
            if (node.nodeType == 'hyperlink') {
                text += node.content[0].value;
            } else {
                text += node.value;
            }
        });
        text += ' ';
    });
    return text;
}

function getMarkHtml(markType, isClosingTag) {
    var markHtml = "<";
    if (isClosingTag == true) markHtml += "/";
    switch (markType) {
        case 'italic':
            return markHtml += "i>";
        case 'bold':
            return markHtml += "b>";
        case 'underline':
            return markHtml += "u>";
    }
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
    let html = Minify(template(data), {
        collapseWhitespace: true,
        removeComments: true
    });
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

function copyImageZoomJs() {
    Filesystem.copyFile(`${paths.imageZoom}/fast-image-zoom.min.js`, `${paths.dist}/image-zoom.js`, () => { });
}

function generateRssFeedXml(data) {
    const fileName = 'feed.xml';
    const feed = new Rss({
        title: 'Tortenkreation SHS',
        description: 'Dein Blog für individuelle Gestaltung von Motivtorten zu verschiedenen Anlässen aus Schloß Holte-Stukenbrock.',
        author: process.env.CONTACTNAME,
        feed_url: `${process.env.ROOT_URL}/${fileName}`,
        site_url: process.env.ROOT_URL,
        image_url: `${process.env.ROOT_URL}/ms-icon-310x310.png`,
        ttl: '60',
        custom_namespaces: {
            'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd'
        }
    });
    for (const item of data.items) {
        feed.item({
            title: item.fields.title,
            description: getDescriptionRaw(item.fields.description),
            url: `${process.env.ROOT_URL}/torten/${item.fields.slug}.html`,
            date: item.fields.creationDate,
            image_url: `${process.env.ROOT_URL}/img/${item.fields.slug}-thumb.jpg`,
            custom_elements: [
                { 'itunes:author': item.fields.title },
                { 'itunes:subtitle': getDescriptionRaw(item.fields.description) },
                {
                    'itunes:image': {
                        _attr: {
                            href: `${process.env.ROOT_URL}/img/${item.fields.slug}-thumb.jpg`
                        }
                    }
                }
            ]
        });
    }
    const xml = feed.xml({ indent: true });
    Filesystem.writeFileSync(`${paths.dist}/${fileName}`, xml, () => { });
}

function init() {
    Dotenv.config();
    prepareDistFolder();
    copyAssets();
    copyImageZoomJs();
}

(function () {
    init();
    registerPartials();
    registerHelpers();
    generateHtml(`${paths.templates}/datenschutz.html`, `${paths.dist}/datenschutz.html`);
    generateHtml(`${paths.templates}/impressum.html`, `${paths.dist}/impressum.html`);
    fetchJsonData().then(data => {
        downloadImages(data.items);
        generateHtml(`${paths.templates}/torten.html`, `${paths.dist}/torten.html`, data);
        generateHtml(`${paths.templates}/index.html`, `${paths.dist}/index.html`, data);
        data.items.forEach(item => {
            generateHtml(`${paths.templates}/torte.html`, `${paths.dist}/torten/${item.fields.slug}.html`, item);
        });
        generateRssFeedXml(data);
    });
})();