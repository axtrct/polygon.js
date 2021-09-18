const cheerio = require("cheerio")
const constants = require("../util/constants")
const { HTTPSRequest } = require("../util/http")

class Marketplace {
    constructor(owner) {
        this.owner = owner
    }

    async productInfo(assetid) {
        let info = await new HTTPSRequest({
            host: constants.POLYGON_API,
            path: `/marketplace/productinfo?assetId=${assetid}`,
            headers: { "User-Agent": constants.GLOBAL_USER_AGENT }
        }).get().catch(e => this.owner.emit("error", "GetProductInfoFail", e))

        // hacky fix to get the asset thumbnail (doesn't always work for some reason) (rare)
        let redirectPage = await new HTTPSRequest({
            host: constants.POLYGON,
            path: `/an-item?id=${assetid}`,
            headers: { 
                "User-Agent": constants.GLOBAL_USER_AGENT,
                "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.owner.session}`, 
            }
        }).get().catch(e => this.owner.emit("error", "GetProductInfoFail", e))

        let assetPage = await new HTTPSRequest({
            host: constants.POLYGON,
            path: redirectPage.headers["location"],
            headers: { 
                "User-Agent": constants.GLOBAL_USER_AGENT,
                "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.owner.session}`, 
            }
        }).get().catch(e => this.owner.emit("error", "GetProductInfoFail", e))

        let $ = cheerio.load(assetPage.body)
        info.body.Thumbnail = $(`img[class="img-fluid mt-3"]`).attr("src")
    
        return info.body
    }
}

module.exports = Marketplace