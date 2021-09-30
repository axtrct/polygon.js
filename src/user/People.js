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
                else this.owner.emit("error", "GetPersonInfoFail", e)
            })
        })
    }
}

module.exports = People