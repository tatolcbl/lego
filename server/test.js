import * as cheerio from 'cheerio'

const html = "<h1>Hello</h1>"
const $ = cheerio.load(html)

console.log($('h1').text())