const https = require("https")

class HTTPSRequest {
    constructor(data = {}, body = "") {
        this.data = Object.assign({
            host: "",
            path: "",
            port: 443,
            method: "",
            headers: {}
        }, data)

        this.body = body
    }

    get() {
        return new Promise((resolve, reject) => {
            this.data.method = "GET"

            let request = https.request(this.data, (response) => {
                if (response.statusCode < 200 || response.statusCode >= 300 && response.statusCode !== 302) return reject(new Error(response.statusCode))
                let body = []
                response.on("data", (chunk) => body.push(chunk))
                response.on("end", () => {
                    if (response.headers["content-type"] == "application/json") return resolve({ headers: response.headers, body: JSON.parse(Buffer.concat(body).toString()) })
                    resolve({ headers: response.headers, body: Buffer.concat(body).toString() })
                })
            })

            request.on("error", reject)
            request.end()
        })
    }

    post() {
        return new Promise((resolve, reject) => {
            this.data.method = "POST"
            
            let request = https.request(this.data, (response) => {
                if (response.statusCode < 200 || response.statusCode >= 300 && response.statusCode !== 302) return reject(new Error(response.statusCode))
                let body = []
                response.on("data", (chunk) => body.push(chunk))
                response.on("end", () => {
                    if (response.headers["content-type"] == "application/json") return resolve({ headers: response.headers, body: JSON.parse(Buffer.concat(body).toString()) })
                    resolve({ headers: response.headers, body: Buffer.concat(body).toString() })
                })
            })

            request.on("error", reject)
            if (this.body.length !== 0) request.write(this.body)
            request.end()
        })
    }
}

module.exports = {
    HTTPSRequest
}