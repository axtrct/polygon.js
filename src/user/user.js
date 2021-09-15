const cheerio = require("cheerio")
const EventEmitter = require("events")
const { HTTPSRequest } = require("../util/http")
const constants = require("../util/constants")
const cookies = require("../util/cookies")
const timing = require("../util/timing")

class User extends EventEmitter {
    constructor(options = {}) {
        super(options)
        this.options = Object.assign({ }, options)
    }

    async login(username, password, totp) {
        new HTTPSRequest({
            host: constants.POLYGON,
            path: "/login",
            headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": constants.GLOBAL_USER_AGENT }
        }, `username=${username}&password=${password}`).post().then(async (loginData) => {
            if (loginData.headers.location == "/login/2fa") return this.emit("authfail", new Error("polygon.js does not currently support accounts that have Two-Factor Authentication enabled."))
            this.session = cookies.parse(loginData.headers["set-cookie"]).find(cookie => cookie.name == constants.POLYGON_SESSION_COOKIE).value
            new HTTPSRequest({
                host: constants.POLYGON,
                path: "/home",
                headers: { "User-Agent": constants.GLOBAL_USER_AGENT, "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}` }
            }).get().then(async (homeData) => {
                let $ = cheerio.load(homeData.body)
                this.csrf = $('meta[name="polygon-csrf"]').attr("content")
                this.ping = timing.interval(() => {
                    new HTTPSRequest({
                        host: constants.POLYGON,
                        path: "/api/account/update-ping",
                        headers: { "User-Agent": constants.GLOBAL_USER_AGENT, "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}`, "x-polygon-csrf": this.csrf }
                    }).post().then((pingData) => this.friendRequests = pingData.body.friendRequests).catch(e => this.emit("error", "PingFail", e))
                }, 30000)
    
                await new HTTPSRequest({
                    host: constants.POLYGON,
                    path: "/api/account/update-ping",
                    headers: { "User-Agent": constants.GLOBAL_USER_AGENT, "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}`, "x-polygon-csrf": this.csrf }
                }).post().then((pingData) => this.friendRequests = pingData.body.friendRequests).catch(e => this.emit("error", "PingFail", e))

                let userInfo = await new HTTPSRequest({
                    host: constants.POLYGON_API,
                    path: `/users/get-by-username?username=${username}`,
                    headers: { "User-Agent": constants.GLOBAL_USER_AGENT }
                }).get().catch(e => this.emit("error", "UserInfoFetchFail", e))
                this.userid = userInfo.body.Id
                this.username = username
                
                this.emit("ready", this)
            }).catch(e => this.emit("error", "CSRFFail", e))
        }).catch(e => this.emit("error", "AuthFail", e))
    }

    async logout() {
        await new HTTPSRequest({
            host: constants.POLYGON,
            path: "/logout",
            headers: { "User-Agent": constants.GLOBAL_USER_AGENT, "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}` }
        }).get().catch(e => console.log(e))

        this.session = null
        this.username = null
        this.userid = null
        this.csrf = null
        this.friendRequests = null
        timing.stopInterval(this.ping)

        this.emit("logout")
    }

    async currency() {
        let moneyData = await new HTTPSRequest({
            host: constants.POLYGON_API,
            path: "/currency/balance",
            headers: { "User-Agent": constants.GLOBAL_USER_AGENT, "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}` }
        }).get().catch(e => console.log(e))
        return moneyData.body.pizzas
    }

    async getSettings() {
        let settingsGet = await new HTTPSRequest({
            host: constants.POLYGON,
            path: "/my/account",
            headers: { "User-Agent": constants.GLOBAL_USER_AGENT, "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}` }
        }).get().catch(e => this.emit("error", "GetSettingsFail", e))

        let $ = cheerio.load(settingsGet.body)
        this.csrf = $('meta[name="polygon-csrf"]').attr("content")

        return {
            blurb: $("#blurb").val(),
            theme: $("#theme").val(),
            filter: $("#filter").is(":checked"),
            debug: $("#debugging").is(":checked")
        }
    }

    async setSettings(blurb, theme, filter, debug) {
        let settings = await this.getSettings()

        blurb = blurb || settings.blurb
        theme = theme || settings.theme
        filter = filter || settings.filter 
        debug = debug || settings.blurb

        await new HTTPSRequest({
            host: constants.POLYGON,
            path: "/api/account/update-settings",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded", 
                "User-Agent": constants.GLOBAL_USER_AGENT, 
                "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}`, 
                "x-polygon-csrf": this.csrf 
            }
        }, `blurb=${encodeURI(blurb)}&theme=${encodeURI(theme)}&filter=${encodeURI(filter)}&debugging=${encodeURI(debug)}`).post().catch(e => this.emit("error", "SetSettingsFail", e))
    }

    async getFeed() {
        let feed = await new HTTPSRequest({
            host: constants.POLYGON,
            path: "/api/account/get-feed",
            headers: { 
                "User-Agent": constants.GLOBAL_USER_AGENT, 
                "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}`, 
                "x-polygon-csrf": this.csrf 
            }
        }).post().catch(e => this.emit("error", "FetchFeedFail", e))

        return feed.body.feed
    }

    username = this.username
    userid = this.userid
    friendRequests = this.friendRequests
}

module.exports = User