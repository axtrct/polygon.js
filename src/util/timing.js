const crypto = require("crypto")
let timers = {}

function interval(func, delay) {
    let timerName = crypto.randomUUID()
    let timer = setInterval(func, delay)
    timers[timerName] = timer
    return  timerName
}

function stopInterval(timer) {
    try {
        clearInterval(timers[timer])
        timers[timer] = null
    }
    catch (e) {}
}

function sleep(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms)
    })
}

module.exports = {
    interval,
    stopInterval,
    sleep,
}