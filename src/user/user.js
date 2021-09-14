const cheerio = require("cheerio")
const EventEmitter = require("events")
const { HTTPSRequest } = require("../util/http")
const constants = require("../util/constants")
const cookies = require("../util/cookies")
const timing = require("../util/timing")
const userinfo = require("../util/userinfo")

class User extends EventEmitter {
    constructor(options = {}) {
        super(options)
        this.options = Object.assign({ }, options)
    }

    async login(username, password, totp) {
        new HTTPSRequest({
            host: constants.POLYGON,
            path: "/login",
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": constants.GLOBAL_USER_AGENT }
        }, `username=${username}&password=${password}`).send().then((loginData) => {
            if (loginData.headers.location == "/login/2fa") return this.emit("authfail", new Error("polygon.js does not currently support accounts that have Two-Factor Authentication enabled."))

            this.session = cookies.parse(loginData.headers["set-cookie"]).find(cookie => cookie.name == constants.POLYGON_SESSION_COOKIE).value
            this.username = username

            new HTTPSRequest({
                host: constants.POLYGON,
                path: "/home",
                method: "GET",
                headers: { "User-Agent": constants.GLOBAL_USER_AGENT, "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}` }
            }).send().then(async (homeData) => {
                let $ = cheerio.load(homeData.body)
                this.userid = userinfo(homeData).id
                this.csrf = $('meta[name="polygon-csrf"]').attr("content")
                this.ping = timing.interval(() => {
                    new HTTPSRequest({
                        host: constants.POLYGON,
                        path: "/api/account/update-ping",
                        method: "POST",
                        headers: { "User-Agent": constants.GLOBAL_USER_AGENT, "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}`, "x-polygon-csrf": this.csrf }
                    }).send().then((pingData) => this.friendRequests = JSON.parse(pingData.body).friendRequests).catch(e => this.emit("error", "PingFail", e))
                }, 30000)
    
                await new HTTPSRequest({
                    host: constants.POLYGON,
                    path: "/api/account/update-ping",
                    method: "POST",
                    headers: { "User-Agent": constants.GLOBAL_USER_AGENT, "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}`, "x-polygon-csrf": this.csrf }
                }).send().then((pingData) => this.friendRequests = JSON.parse(pingData.body).friendRequests).catch(e => this.emit("error", "PingFail", e))
                
                this.emit("ready", this)
            }).catch(e => this.emit("error", "CSRFFail", e))
        }).catch(e => this.emit("error", "AuthFail", e))
    }

    async logout() {
        await new HTTPSRequest({
            host: constants.POLYGON,
            path: "/logout",
            method: "GET",
            headers: { "User-Agent": constants.GLOBAL_USER_AGENT, "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}` }
        }).send().catch(e => console.log(e))

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
            host: constants.POLYGON,
            path: "/my/money",
            method: "GET",
            headers: { "User-Agent": constants.GLOBAL_USER_AGENT, "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}` }
        }).send().catch(e => console.log(e))
        return userinfo(moneyData).money
    }

    async getSettings() {
        let settingsGet = await new HTTPSRequest({
            host: constants.POLYGON,
            path: "/my/account",
            method: "GET",
            headers: { "User-Agent": constants.GLOBAL_USER_AGENT, "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}` }
        }).send().catch(e => this.emit("error", "GetSettingsPageFail", e))

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
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded", 
                "User-Agent": constants.GLOBAL_USER_AGENT, 
                "Cookie": `${constants.POLYGON_SESSION_COOKIE}=${this.session}`, 
                "x-polygon-csrf": this.csrf 
            }
        }, `blurb=${encodeURI(blurb)}&theme=${encodeURI(theme)}&filter=${encodeURI(filter)}&debugging=${encodeURI(debug)}`).send().catch(e => this.emit("error", "SetSettingsFail", e))
    }

    username = this.username
    userid = this.userid
    friendRequests = this.friendRequests
}

module.exports = User