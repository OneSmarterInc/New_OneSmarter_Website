import { create } from 'xmlbuilder2';
import fs from 'fs';
import { siteBaseUrl, siteDirectory } from './src/data/siteDirectory.js';

const root = create({ version: '1.0' })
  .ele('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });

siteDirectory.forEach(({ route }) => {
  root.ele('url').ele('loc').txt(`${siteBaseUrl}${route === '/' ? '' : route}`);
});

fs.writeFileSync('./public/sitemap.xml', root.end({ prettyPrint: true }));
console.log('Success: Sitemap generated in /public/sitemap.xml');
