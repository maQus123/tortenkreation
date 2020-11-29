const Filesystem = require('fs');
const Handlebars = require('handlebars');
const Contentful = require("contentful");
const Dotenv = require('dotenv');
const Fetch = require('node-fetch');

function initFolders() {
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

function downloadImages(data) {
    // TODO: Download one thumb image for each cake
    data.items.forEach(item => {
        item.fields.images.forEach((image, i) => {
            Fetch(`https:${image.fields.file.url}?fm=jpg&q=75&fit=thumb&w=500&h=375`)
                .then(res => {
                    const path = `./dist/img/${item.fields.slug}-${i + 1}.jpg`;
                    const stream = Filesystem.createWriteStream(path);
                    res.body.pipe(stream);
                });
        });
    });
}

(function () {
    initFolders();
    Dotenv.config();
    getData().then(data => {

        downloadImages(data);

        //index.html
        const indexPage = Filesystem.readFileSync('./src/index.html', 'utf8').toString();
        Filesystem.writeFile('./dist/index.html', indexPage, function (err) {
            if (err) return console.log(err);
        });

        //torten.html
        const cakesTemplate = Handlebars.compile(Filesystem.readFileSync('./src/torten.html', 'utf8').toString());
        const cakesHtml = cakesTemplate(data);
        Filesystem.writeFile('./dist/torten.html', cakesHtml, function (err) {
            if (err) return console.log(err);
            console.log('Success torten.html');
        });

        //torte.html
        const cakeTemplate = Handlebars.compile(Filesystem.readFileSync('./src/torte.html', 'utf8').toString());
        data.items.forEach(item => {
            const slug = item.fields.slug;
            const cakeHtml = cakeTemplate(item);
            Filesystem.writeFile(`./dist/torten/${slug}.html`, cakeHtml, function (err) {
                if (err) return console.log(err);
                console.log(`Success ${slug}.html`);
            });
        });

    });
})();

// TODO: Refactor and clean