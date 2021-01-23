Tortenkreation website based on [Jamstack-Architecture](https://jamstack.org/) with custom static site generator.

Inspired by Smashingmagazine's [Custom Made Static Site Generator](https://www.smashingmagazine.com/2020/09/stack-custom-made-static-site-generator/) article.

## Tech-Stack
 - Generator in pure Javascript with [Node.js](https://nodejs.org/)
 - [Handlebars](https://handlebarsjs.com/) templates
 - [Bootstrap v5.0.0-beta1](https://getbootstrap.com/)
 - [Azure Static Web Apps](https://azure.microsoft.com/de-de/services/app-service/static/) hosting platform
 - Github actions
 - [Contentful](https://www.contentful.com/) Headless-CMS for content

## Getting started
1. Add `.env` file to project root folder:
```
ROOT_URL=*********
CONTENTFUL_SPACE_ID=*********
CONTENTFUL_ACCESS_TOKEN=*********
CONTACTEMAIL=*********
CONTACTNAME=*********
```
2. Run `npm install`
3. Run `npm run build` to run generator