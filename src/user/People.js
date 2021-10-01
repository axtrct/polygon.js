const cheerio = require("cheerio")
const constants = require("../util/constants")
const { HTTPSRequest } = require("../util/http")

class People {
    constructor(owner) {
        this.owner = owner
    }

    getInfo(userid) {
        return new Promise(async (resolve, reject) => {
            new HTTPSRequest({
                host: constants.POLYGON_API,
                path: `/users/${encodeURI(userid)}`,
                headers: { "User-Agent": constants.GLOBAL_USER_AGENT }
            }).get()
            .then(info => {
                resolve(info.body)
            })
            .catch(e => {
                if (e.message == "404") resolve(null) 
                else {
                    this.owner.emit("error", "GetPersonInfoFail", e)
                    reject(e)
                }
            })
        })
    }

    getProfile(userid) {
        return new Promise(async (resolve, reject) => {
            new HTTPSRequest({
                host: constants.POLYGON,
                path: `/user?ID=${encodeURI(userid)}`,
                headers: { "User-Agent": constants.GLOBAL_USER_AGENT, "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.owner.session}` }
            }).get()
            .then(profile => {
                let $ = cheerio.load(profile.body)
                resolve({
                    blurb: $(`div[class="text-center"] > p[class="text-break"]`).text()
                })
            })
            .catch(e => {
                if (e.message == "404") resolve(null) 
                else {
                    this.owner.emit("error", "GetPersonProfileFail", e)
                    reject(e)
                }
            })
        })
    }
}

module.exports = People