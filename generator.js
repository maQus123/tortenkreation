const Filesystem = require('fs');
const Handlebars = require('handlebars');
const Contentful = require("contentful");
const Dotenv = require('dotenv');
const Fetch = require('node-fetch');

async function generate(src, dist) {
    const source = Filesystem.readFileSync(src, 'utf8').toString();
    const template = Handlebars.compile(source);
    Dotenv.config();
    const client = Contentful.createClient({
        space: process.env.CONTENTFUL_SPACE_ID,
        accessToken: process.env.CONTENTFUL_ACCESS_TOKEN
    });
    client.getEntries({ content_type: 'cake', order: '-fields.creationDate' }).then(function (result) {

        result.items.forEach(item => {
            item.fields.images.forEach(function (image, i) {
                const url = 'https:' + image.fields.file.url + '?fm=jpg&q=75&fit=thumb&w=500&h=375';
                download(url, item.fields.slug + '-' + i + '.jpg');
            });
        });

        const html = template(result);

        Filesystem.writeFile(dist, html, function (err) {
            if (err) return console.log(err);
            console.log('Success');
        });

    }).catch(err => console.log(err));
}

async function download(fromUrl, fileName) {
    const response = await Fetch(fromUrl);
    const buffer = await response.buffer();
    Filesystem.writeFile('./dist/' + fileName, buffer, () =>
        console.log(fileName));
}

async function copy(src, dist) {
    const indexPage = Filesystem.readFileSync(src, 'utf8').toString();
    Filesystem.writeFile(dist, indexPage, function (err) {
        if (err) return console.log(err);
    });
}

if (!Filesystem.existsSync('dist')) { Filesystem.mkdirSync('dist'); }
generate('./src/torten.html', './dist/torten.html');
copy('./src/index.html', './dist/index.html');