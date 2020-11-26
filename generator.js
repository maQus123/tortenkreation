const Filesystem = require('fs');
const Handlebars = require('handlebars');
const Contentful = require("contentful");
const Dotenv = require('dotenv');

async function generate(src, dist) {
    const source = Filesystem.readFileSync(src, 'utf8').toString();
    const template = Handlebars.compile(source);
    Dotenv.config();
    const client = Contentful.createClient({
        space: process.env.CONTENTFUL_SPACE_ID,
        accessToken: process.env.CONTENTFUL_ACCESS_TOKEN
    });
    client.getEntries({ content_type: 'cake', order: '-fields.creationDate' }).then(function (result) {
        const html = template(result);
        if (!Filesystem.existsSync('dist')) { Filesystem.mkdirSync('dist'); }
        Filesystem.writeFile(dist, html, function (err) {
            if (err) return console.log(err);
            console.log('Success');
        });
    }).catch(err => console.log(err));
}

async function copy(src, dist) {
    const indexPage = Filesystem.readFileSync(src, 'utf8').toString();
    Filesystem.writeFile(dist, indexPage, function (err) {
        if (err) return console.log(err);
    });
}

generate('./src/torten.html', './dist/torten.html');
copy('./src/index.html', './dist/index.html');