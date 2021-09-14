const cheerio = require("cheerio")

function parse(response) {
    let $ = cheerio.load(response.body)
    let _ = $("head > script")["3"].children[0].data.replace(/\r\n/g, "\n").split("\n")
    let unparsedJson = ""
    for (let i = 0; i < _.length; i++) {
        let line = _[i].trim()
        if (line == "" || line == "var polygon = {};" || line == "polygon.user =") continue
        unparsedJson += line.replace(";", "") + " "
    }
    // super insecure and is a very hacky solution lmaooooo
    return new Function(`return ${unparsedJson}`)()
}

module.exports = parse