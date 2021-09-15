const User = require("./User")
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
    
        return info.body
    }
}

module.exports = Marketplace