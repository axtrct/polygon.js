const http = require("http")
const https = require("https")

class HTTPRequest {
    constructor(data = {}, body = "") {
        this.data = Object.assign({
            host: "",
            path: "",
            port: 80,
            method: "GET",
            headers: {}
        }, data)

        this.body = body
    }

    send() {
        return new Promise((resolve, reject) => {
            let request = http.request(this.data, (response) => {
                if (response.statusCode < 200 || response.statusCode >= 300 && response.statusCode !== 302) return reject(new Error(response.statusCode))
                let body = []
                response.on("data", (chunk) => body.push(chunk))
                response.on("end", () => resolve({ headers: response.headers, body: Buffer.concat(body).toString() }))
            })

            request.on("error", reject)
            if (this.body !== "") request.write(this.body)
            request.end()
        })
    }
}

class HTTPSRequest {
    constructor(data = {}, body = "") {
        this.data = Object.assign({
            host: "",
            path: "",
            port: 443,
            method: "GET",
            headers: {}
        }, data)

        this.body = body
    }

    send() {
        return new Promise((resolve, reject) => {
            let request = https.request(this.data, (response) => {
                if (response.statusCode < 200 || response.statusCode >= 300 && response.statusCode !== 302) return reject(new Error(response.statusCode))
                let body = []
                response.on("data", (chunk) => body.push(chunk))
                response.on("end", () => resolve({ headers: response.headers, body: Buffer.concat(body).toString() }))
            })

            request.on("error", reject)
            if (this.body !== "") request.write(this.body)
            request.end()
        })
    }
}

module.exports = {
    HTTPRequest,
    HTTPSRequest
}